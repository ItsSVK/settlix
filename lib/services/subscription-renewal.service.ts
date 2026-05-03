import { PublicKey } from '@solana/web3.js'
import { getMint } from '@solana/spl-token'
import { RenewalStatus, SubscriptionStatus } from '@/lib/generated/prisma/client'
import { apiLogger } from '@/lib/api/logger'
import { prisma } from '@/lib/db'
import { getSubscriptionRelayerKeypair } from '@/lib/env/server'
import { humanToRawAmount } from '@/lib/solana/amount'
import { createServerConnection } from '@/lib/solana/connection'
import { RPC_COMMITMENT } from '@/lib/solana/constants'
import { buildRenewalTx } from '@/lib/solana/subscriptionTxBuilder'

const MAX_RETRY_ATTEMPTS = 7
const PAST_DUE_GRACE_DAYS = 14

function nextPeriodEnd(from: Date, interval: string): Date {
  const date = new Date(from)
  if (interval === 'weekly') date.setDate(date.getDate() + 7)
  else if (interval === 'monthly') date.setMonth(date.getMonth() + 1)
  else if (interval === 'yearly') date.setFullYear(date.getFullYear() + 1)
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

  // Auto-cancel subscriptions that have been past_due beyond the grace period
  const autoCancelled = await prisma.subscription.updateMany({
    where: {
      status: SubscriptionStatus.past_due,
      currentPeriodEnd: { lt: pastDueCutoff },
    },
    data: { status: SubscriptionStatus.cancelled, cancelledAt: now },
  })
  summary.cancelled = autoCancelled.count

  // Find all active subscriptions whose billing period has ended
  const due = await prisma.subscription.findMany({
    where: {
      status: SubscriptionStatus.active,
      currentPeriodEnd: { lte: now },
    },
    include: {
      link: { select: { token: true, amount: true, interval: true, merchantWallet: true } },
    },
  })

  for (const sub of due) {
    summary.processed++
    const result = await executeRenewal(sub.id, {
      subscriberWallet: sub.subscriberWallet,
      merchantWallet: sub.link.merchantWallet,
      token: sub.link.token,
      amount: sub.link.amount.toString(),
      interval: sub.link.interval ?? 'monthly',
      currentPeriodEnd: sub.currentPeriodEnd,
    })
    if (result.ok) summary.succeeded++
    else summary.failed++
  }

  return summary
}

async function executeRenewal(
  subscriptionId: string,
  data: {
    subscriberWallet: string
    merchantWallet: string
    token: string
    amount: string
    interval: string
    currentPeriodEnd: Date
  },
): Promise<{ ok: boolean; reason?: string }> {
  const connection = createServerConnection()

  // Count prior failures for this period to enforce retry cap
  const failureCount = await prisma.subscriptionRenewal.count({
    where: { subscriptionId, status: RenewalStatus.failed },
  })

  if (failureCount >= MAX_RETRY_ATTEMPTS) {
    await prisma.subscription.update({
      where: { id: subscriptionId },
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
    const { Decimal } = await import('@/lib/generated/prisma/internal/prismaNamespace')
    const transferAmountRaw = humanToRawAmount(new Decimal(data.amount), mintInfo.decimals)

    const tx = await buildRenewalTx({
      connection,
      subscriber: new PublicKey(data.subscriberWallet),
      merchant: new PublicKey(data.merchantWallet),
      relayerKeypair,
      settlementMint: mintPk,
      transferAmountRaw,
      mintDecimals: mintInfo.decimals,
      subscriptionId,
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
    apiLogger.warn('Subscription renewal failed', { subscriptionId, reason: failureReason })

    await prisma.subscriptionRenewal.create({
      data: {
        subscriptionId,
        status: RenewalStatus.failed,
        txSignature: txSignature ?? null,
        dueAt: data.currentPeriodEnd,
        failureReason,
        attemptCount: failureCount + 1,
      },
    })
    return { ok: false, reason: failureReason }
  }

  // Success — advance the period
  const nextEnd = nextPeriodEnd(data.currentPeriodEnd, data.interval)
  await prisma.$transaction([
    prisma.subscriptionRenewal.create({
      data: {
        subscriptionId,
        status: RenewalStatus.succeeded,
        txSignature,
        dueAt: data.currentPeriodEnd,
        executedAt: new Date(),
        attemptCount: failureCount + 1,
      },
    }),
    prisma.subscription.update({
      where: { id: subscriptionId },
      data: { currentPeriodEnd: nextEnd, status: SubscriptionStatus.active },
    }),
  ])

  apiLogger.info('Subscription renewal succeeded', { subscriptionId, txSignature })
  return { ok: true }
}
