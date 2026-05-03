import { randomUUID } from 'node:crypto'
import { PublicKey } from '@solana/web3.js'
import { getMint } from '@solana/spl-token'
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
import { getSubscriptionRelayerKeypair } from '@/lib/env/server'
import { humanToRawAmount } from '@/lib/solana/amount'
import { createServerConnection } from '@/lib/solana/connection'
import { RPC_COMMITMENT } from '@/lib/solana/constants'
import { buildRenewalTx } from '@/lib/solana/subscriptionTxBuilder'

const MAX_RETRY_ATTEMPTS = 7
const PAST_DUE_GRACE_DAYS = 14

function nextPeriodEnd(from: Date, interval: SubscriptionInterval): Date {
  const date = new Date(from)
  if (interval === SubscriptionInterval.weekly) date.setDate(date.getDate() + 7)
  else if (interval === SubscriptionInterval.monthly) date.setMonth(date.getMonth() + 1)
  else if (interval === SubscriptionInterval.yearly) date.setFullYear(date.getFullYear() + 1)
  return date
}

export type RenewalSummary = {
  processed: number
  succeeded: number
  failed: number
  cancelled: number
}

export async function processDueRenewals(): Promise<RenewalSummary> {
  const summary: RenewalSummary = { processed: 0, succeeded: 0, failed: 0, cancelled: 0 }

  const now = new Date()
  const pastDueCutoff = new Date(now.getTime() - PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000)

  // Auto-cancel subscribers that have been past_due beyond the grace period
  const autoCancelled = await prisma.subscriber.updateMany({
    where: {
      status: SubscriptionStatus.past_due,
      currentPeriodEnd: { lt: pastDueCutoff },
    },
    data: { status: SubscriptionStatus.cancelled, cancelledAt: now },
  })
  summary.cancelled = autoCancelled.count

  // Find all active subscribers whose billing period has ended
  const due = await prisma.subscriber.findMany({
    where: {
      status: SubscriptionStatus.active,
      currentPeriodEnd: { lte: now },
    },
    include: {
      plan: {
        select: { token: true, amount: true, interval: true, merchant: { select: { wallet: true } } },
      },
    },
  })

  for (const sub of due) {
    summary.processed++
    const result = await executeRenewal(sub.id, {
      subscriberWallet: sub.subscriberWallet,
      merchantWallet: sub.plan.merchant.wallet,
      token: sub.plan.token,
      amount: sub.plan.amount.toString(),
      interval: sub.plan.interval,
      currentPeriodEnd: sub.currentPeriodEnd,
      // Snapshot values captured at billing time
      amountSnapshot: sub.plan.amount,
      tokenSnapshot: sub.plan.token,
    })
    if (result.ok) summary.succeeded++
    else summary.failed++
  }

  return summary
}

async function executeRenewal(
  subscriberId: string,
  data: {
    subscriberWallet: string
    merchantWallet: string
    token: string
    amount: string
    interval: SubscriptionInterval
    currentPeriodEnd: Date
    amountSnapshot: Decimal
    tokenSnapshot: string
  },
): Promise<{ ok: boolean; reason?: string }> {
  const connection = createServerConnection()

  // Count prior failed renewals for this subscriber to enforce retry cap
  const failureCount = await prisma.subscriptionRenewal.count({
    where: { subscriberId, status: RenewalStatus.failed },
  })

  if (failureCount >= MAX_RETRY_ATTEMPTS) {
    await prisma.subscriber.update({
      where: { id: subscriberId },
      data: { status: SubscriptionStatus.past_due },
    })
    return { ok: false, reason: 'Max retry attempts reached — marked past_due' }
  }

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
    apiLogger.warn('Subscription renewal failed', { subscriberId, reason: failureReason })

    // Create the renewal record first, then link a failed PaymentExecution if a tx was submitted
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
          attemptCount: failureCount + 1,
        },
      })

      // Only record an execution if a tx was actually submitted on-chain
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

  // Success — advance the billing period
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
        attemptCount: failureCount + 1,
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

  apiLogger.info('Subscription renewal succeeded', { subscriberId, txSignature })
  return { ok: true }
}
