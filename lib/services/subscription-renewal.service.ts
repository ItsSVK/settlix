import { randomUUID } from 'node:crypto'
import { PublicKey } from '@solana/web3.js'
import { getMint } from '@solana/spl-token'
import { Resend } from 'resend'
import {
  RenewalStatus,
  SubscriptionStatus,
  PaymentExecutionStatus,
  PaymentExecutionSource,
  SubscriptionInterval,
} from '@/lib/generated/prisma/client'
import { Decimal } from '@/lib/generated/prisma/internal/prismaNamespace'
import { apiLogger } from '@/lib/api/logger'
import { prisma } from '@/lib/db'
import { getSubscriptionRelayerKeypair, getResendApiKey, getEmailSender } from '@/lib/env/server'
import { nextPeriodEnd } from '@/lib/services/subscription.service'
import { deliverPaymentWebhook } from '@/lib/services/payment-webhook.service'
import { humanToRawAmount } from '@/lib/solana/amount'
import { createServerConnection } from '@/lib/solana/connection'
import { RPC_COMMITMENT } from '@/lib/solana/constants'
import { buildRenewalTx } from '@/lib/solana/subscriptionTxBuilder'
import { getSymbolByMint } from '@/lib/tokens/tokens'
import {
  buildConfirmationHtml,
  buildConfirmationSubject,
  buildUserCancelledHtml,
  buildUserCancelledSubject,
  buildRenewalWarningHtml,
  buildRenewalWarningSubject,
  buildCancelledHtml,
  buildCancelledSubject,
} from '@/lib/email/subscription-email'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns midnight UTC for a given date (time stripped). */
function toMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0))
}

/** Tonight's midnight (the midnight that is still in the future at the time of calling). */
function tonightsMidnight(now: Date): Date {
  const h = now.getUTCHours()
  // If it's midnight (0) we're AT the boundary — use today's midnight
  return h === 0 ? toMidnight(now) : toMidnight(new Date(now.getTime() + 24 * 60 * 60 * 1000))
}

export type RenewalSummary = {
  processed: number
  succeeded: number
  failed: number
  cancelled: number
}

// ---------------------------------------------------------------------------
// Main entry point — called by the hourly cron
// ---------------------------------------------------------------------------

export async function processDueRenewals(now: Date = new Date()): Promise<RenewalSummary> {
  const utcHour = now.getUTCHours()

  if (utcHour === 22) return runAttemptWindow(1, now)
  if (utcHour === 23) return runAttemptWindow(2, now)
  if (utcHour === 0) return runAttemptWindow(3, now)

  // Nothing to do at other hours
  return { processed: 0, succeeded: 0, failed: 0, cancelled: 0 }
}

// ---------------------------------------------------------------------------
// Per-attempt window
// ---------------------------------------------------------------------------

async function runAttemptWindow(attempt: 1 | 2 | 3, now: Date): Promise<RenewalSummary> {
  const summary: RenewalSummary = { processed: 0, succeeded: 0, failed: 0, cancelled: 0 }

  const midnight = tonightsMidnight(now)

  // ±5 min tolerance to handle cron jitter
  const windowStart = new Date(midnight.getTime() - 5 * 60_000)
  const windowEnd = new Date(midnight.getTime() + 5 * 60_000)

  const subscribers = await prisma.subscriber.findMany({
    where: {
      status: SubscriptionStatus.active,
      currentPeriodEnd: { gte: windowStart, lte: windowEnd },
    },
    include: {
      plan: {
        select: {
          id: true,
          token: true,
          amount: true,
          interval: true,
          title: true,
          merchant: { select: { wallet: true, webhookUrl: true, webhookSecret: true } },
        },
      },
      renewals: {
        where: {
          dueAt: { gte: windowStart, lte: windowEnd },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  for (const sub of subscribers) {
    const periodFailed = sub.renewals.filter((r) => r.status === RenewalStatus.failed).length
    const periodSucceeded = sub.renewals.some((r) => r.status === RenewalStatus.succeeded)

    // Skip if already succeeded this period
    if (periodSucceeded) continue

    // Each attempt only processes subscribers at the right failure count
    if (periodFailed !== attempt - 1) continue

    summary.processed++

    const result = await executeRenewal(sub.id, {
      subscriberWallet: sub.subscriberWallet,
      subscriberEmail: sub.subscriberEmail,
      subscriberName: sub.subscriberName,
      merchantWallet: sub.plan.merchant.wallet,
      webhookUrl: sub.plan.merchant.webhookUrl,
      webhookSecret: sub.plan.merchant.webhookSecret,
      planId: sub.plan.id,
      planTitle: sub.plan.title,
      token: sub.plan.token,
      amount: sub.plan.amount.toString(),
      interval: sub.plan.interval,
      currentPeriodEnd: sub.currentPeriodEnd,
      amountSnapshot: sub.plan.amount,
      tokenSnapshot: sub.plan.token,
      attemptNumber: attempt,
    })

    if (result.ok) {
      summary.succeeded++
    } else {
      summary.failed++
      if (attempt === 3) {
        // Final failure — cancel and notify
        await prisma.subscriber.update({
          where: { id: sub.id },
          data: { status: SubscriptionStatus.cancelled, cancelledAt: now },
        })
        summary.cancelled++
        await sendCancellationEmail({
          subscriberEmail: sub.subscriberEmail,
          subscriberName: sub.subscriberName,
          planTitle: sub.plan.title,
          planId: sub.plan.id,
          amount: sub.plan.amount.toString(),
          token: sub.plan.token,
          interval: sub.plan.interval,
          failureReason: result.reason,
        })
      } else {
        const nextRetry = attempt === 1 ? '11:00 PM UTC' : 'midnight (12:00 AM UTC)'
        await sendWarningEmail({
          subscriberEmail: sub.subscriberEmail,
          subscriberName: sub.subscriberName,
          planTitle: sub.plan.title,
          planId: sub.plan.id,
          subscriberId: sub.id,
          amount: sub.plan.amount.toString(),
          token: sub.plan.token,
          interval: sub.plan.interval,
          attemptNumber: attempt,
          nextRetryTime: nextRetry,
          failureReason: result.reason,
        })
      }
    }
  }

  return summary
}

// ---------------------------------------------------------------------------
// On-chain renewal execution
// ---------------------------------------------------------------------------

async function executeRenewal(
  subscriberId: string,
  data: {
    subscriberWallet: string
    subscriberEmail: string | null
    subscriberName: string | null
    merchantWallet: string
    webhookUrl: string | null
    webhookSecret: string | null
    planId: string
    planTitle: string | null
    token: string
    amount: string
    interval: SubscriptionInterval
    currentPeriodEnd: Date
    amountSnapshot: Decimal
    tokenSnapshot: string
    attemptNumber: 1 | 2 | 3
  },
): Promise<{ ok: boolean; reason?: string }> {
  const connection = createServerConnection()
  let txSignature: string | undefined
  let failureReason: string | undefined

  try {
    const relayerKeypair = getSubscriptionRelayerKeypair()
    const mintPk = new PublicKey(data.token)
    const mintInfo = await getMint(connection, mintPk, RPC_COMMITMENT)
    const transferAmountRaw = humanToRawAmount(new Decimal(data.amount), mintInfo.decimals)

    const tx = await buildRenewalTx({
      connection,
      subscriber: new PublicKey(data.subscriberWallet),
      merchant: new PublicKey(data.merchantWallet),
      relayerKeypair,
      settlementMint: mintPk,
      transferAmountRaw,
      mintDecimals: mintInfo.decimals,
      subscriptionId: subscriberId,
    })

    txSignature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    })

    const { value } = await connection.confirmTransaction(
      { signature: txSignature, ...(await connection.getLatestBlockhash(RPC_COMMITMENT)) },
      RPC_COMMITMENT,
    )

    if (value?.err) {
      failureReason = JSON.stringify(value.err)
      throw new Error(failureReason)
    }
  } catch (e) {
    failureReason = failureReason ?? (e instanceof Error ? e.message : 'Unknown error')
    apiLogger.warn('Subscription renewal failed', { subscriberId, attempt: data.attemptNumber, reason: failureReason })

    await prisma.$transaction(async (tx) => {
      const renewal = await tx.subscriptionRenewal.create({
        data: {
          subscriberId,
          amountSnapshot: data.amountSnapshot,
          tokenSnapshot: data.tokenSnapshot,
          periodStart: data.currentPeriodEnd,
          dueAt: data.currentPeriodEnd,
          status: RenewalStatus.failed,
          failureReason,
          attemptCount: data.attemptNumber,
        },
      })
      if (txSignature) {
        await tx.paymentExecution.create({
          data: {
            clientExecutionId: randomUUID(),
            source: PaymentExecutionSource.subscription,
            renewalId: renewal.id,
            userWallet: data.subscriberWallet,
            inputToken: data.token,
            inputAmount: BigInt(0),
            outputAmount: BigInt(0),
            txSignature,
            status: PaymentExecutionStatus.failed,
          },
        })
      }
    })

    return { ok: false, reason: failureReason }
  }

  // Success — advance to next midnight-aligned period
  const nextEnd = nextPeriodEnd(data.currentPeriodEnd, data.interval)

  await prisma.$transaction(async (tx) => {
    const renewal = await tx.subscriptionRenewal.create({
      data: {
        subscriberId,
        amountSnapshot: data.amountSnapshot,
        tokenSnapshot: data.tokenSnapshot,
        periodStart: data.currentPeriodEnd,
        dueAt: data.currentPeriodEnd,
        status: RenewalStatus.succeeded,
        attemptCount: data.attemptNumber,
        executedAt: new Date(),
      },
    })
    await tx.paymentExecution.create({
      data: {
        clientExecutionId: randomUUID(),
        source: PaymentExecutionSource.subscription,
        renewalId: renewal.id,
        userWallet: data.subscriberWallet,
        inputToken: data.token,
        inputAmount: humanToRawAmount(data.amountSnapshot, 6),
        outputAmount: humanToRawAmount(data.amountSnapshot, 6),
        txSignature: txSignature!,
        status: PaymentExecutionStatus.paid,
      },
    })
    await tx.subscriber.update({
      where: { id: subscriberId },
      data: { currentPeriodEnd: nextEnd, status: SubscriptionStatus.active },
    })
  })

  apiLogger.info('Subscription renewal succeeded', { subscriberId, txSignature, attempt: data.attemptNumber })

  if (data.webhookUrl) {
    void deliverPaymentWebhook({
      webhookUrl: data.webhookUrl,
      webhookSecret: data.webhookSecret,
      payload: {
        subscriberId,
        planId: data.planId,
        txSignature: txSignature!,
        inputToken: data.token,
        inputAmount: humanToRawAmount(data.amountSnapshot, 6).toString(),
        outputAmount: humanToRawAmount(data.amountSnapshot, 6).toString(),
        userWallet: data.subscriberWallet,
        timestamp: new Date().toISOString(),
      },
    })
  }

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Email helpers
// ---------------------------------------------------------------------------

async function sendWarningEmail(params: {
  subscriberEmail: string | null
  subscriberName: string | null
  planTitle: string | null
  planId: string
  subscriberId: string
  amount: string
  token: string
  interval: string
  attemptNumber: 1 | 2
  nextRetryTime: string
  failureReason?: string
}): Promise<void> {
  if (!params.subscriberEmail) return
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const tokenSymbol = getSymbolByMint(params.token) ?? params.token.slice(0, 6)

  try {
    const resend = new Resend(getResendApiKey())
    const emailData = {
      subscriberName: params.subscriberName,
      subscriberEmail: params.subscriberEmail,
      planTitle: params.planTitle,
      amount: params.amount,
      tokenSymbol,
      interval: params.interval,
      manageUrl: `${siteUrl}/manage/${params.subscriberId}`,
      subscribeUrl: `${siteUrl}/subscribe/${params.planId}`,
      attemptNumber: params.attemptNumber,
      nextRetryTime: params.nextRetryTime,
      failureReason: params.failureReason,
    }
    const { error } = await resend.emails.send({
      from: getEmailSender(),
      to: params.subscriberEmail,
      subject: buildRenewalWarningSubject(emailData),
      html: buildRenewalWarningHtml(emailData),
    })
    if (error) apiLogger.warn('Renewal warning email failed', { error: error.message, planId: params.planId })
  } catch (e) {
    apiLogger.warn('Renewal warning email threw', { error: e })
  }
}

export async function sendSubscriptionConfirmationEmail(params: {
  subscriberEmail: string | null
  subscriberName: string | null
  planTitle: string | null
  planId: string
  subscriberId: string
  amount: string
  token: string
  interval: string
  nextBillingDate: string
  txSignature: string
}): Promise<void> {
  if (!params.subscriberEmail) return
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const tokenSymbol = getSymbolByMint(params.token) ?? params.token.slice(0, 6)

  try {
    const resend = new Resend(getResendApiKey())
    const emailData = {
      subscriberName: params.subscriberName,
      subscriberEmail: params.subscriberEmail,
      planTitle: params.planTitle,
      amount: params.amount,
      tokenSymbol,
      interval: params.interval,
      nextBillingDate: params.nextBillingDate,
      manageUrl: `${siteUrl}/manage/${params.subscriberId}`,
      txSignature: params.txSignature,
    }
    const { error } = await resend.emails.send({
      from: getEmailSender(),
      to: params.subscriberEmail,
      subject: buildConfirmationSubject(emailData),
      html: buildConfirmationHtml(emailData),
    })
    if (error) apiLogger.warn('Subscription confirmation email failed', { error: error.message })
  } catch (e) {
    apiLogger.warn('Subscription confirmation email threw', { error: e })
  }
}

export async function sendSubscriptionUserCancelledEmail(params: {
  subscriberEmail: string | null
  subscriberName: string | null
  planTitle: string | null
  planId: string
  amount: string
  token: string
  interval: string
  accessUntil: string
}): Promise<void> {
  if (!params.subscriberEmail) return
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const tokenSymbol = getSymbolByMint(params.token) ?? params.token.slice(0, 6)

  try {
    const resend = new Resend(getResendApiKey())
    const emailData = {
      subscriberName: params.subscriberName,
      subscriberEmail: params.subscriberEmail,
      planTitle: params.planTitle,
      amount: params.amount,
      tokenSymbol,
      interval: params.interval,
      accessUntil: params.accessUntil,
      subscribeUrl: `${siteUrl}/subscribe/${params.planId}`,
    }
    const { error } = await resend.emails.send({
      from: getEmailSender(),
      to: params.subscriberEmail,
      subject: buildUserCancelledSubject(emailData),
      html: buildUserCancelledHtml(emailData),
    })
    if (error) apiLogger.warn('User cancellation email failed', { error: error.message })
  } catch (e) {
    apiLogger.warn('User cancellation email threw', { error: e })
  }
}

async function sendCancellationEmail(params: {
  subscriberEmail: string | null
  subscriberName: string | null
  planTitle: string | null
  planId: string
  amount: string
  token: string
  interval: string
  failureReason?: string
}): Promise<void> {
  if (!params.subscriberEmail) return
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const tokenSymbol = getSymbolByMint(params.token) ?? params.token.slice(0, 6)

  try {
    const resend = new Resend(getResendApiKey())
    const emailData = {
      subscriberName: params.subscriberName,
      subscriberEmail: params.subscriberEmail,
      planTitle: params.planTitle,
      amount: params.amount,
      tokenSymbol,
      interval: params.interval,
      subscribeUrl: `${siteUrl}/subscribe/${params.planId}`,
      failureReason: params.failureReason,
    }
    const { error } = await resend.emails.send({
      from: getEmailSender(),
      to: params.subscriberEmail,
      subject: buildCancelledSubject(emailData),
      html: buildCancelledHtml(emailData),
    })
    if (error) apiLogger.warn('Cancellation email failed', { error: error.message, planId: params.planId })
  } catch (e) {
    apiLogger.warn('Cancellation email threw', { error: e })
  }
}
