import {
  SubscriptionStatus,
  RenewalStatus,
  PaymentExecutionStatus,
  PaymentExecutionSource,
  SubscriptionInterval,
} from '@/lib/generated/prisma/client'
import { Decimal } from '@/lib/generated/prisma/internal/prismaNamespace'
import { ApiError } from '@/lib/api/errors'
import {
  ALREADY_SUBSCRIBED,
  DB_CREATE_FAILED,
  DB_QUERY_FAILED,
  DB_UNEXPECTED,
  DB_UPDATE_FAILED,
  FORBIDDEN,
  NOT_FOUND,
  SUBSCRIPTION_NOT_FOUND,
} from '@/lib/api/constants'
import { apiLogger } from '@/lib/api/logger'
import { prisma } from '@/lib/db'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nextPeriodEnd(from: Date, interval: SubscriptionInterval): Date {
  const date = new Date(from)
  if (interval === SubscriptionInterval.weekly) date.setDate(date.getDate() + 7)
  else if (interval === SubscriptionInterval.monthly) date.setMonth(date.getMonth() + 1)
  else if (interval === SubscriptionInterval.yearly) date.setFullYear(date.getFullYear() + 1)
  return date
}

// ---------------------------------------------------------------------------
// SubscriptionPlan
// ---------------------------------------------------------------------------

export async function createSubscriptionPlan(data: {
  merchantWallet: string
  token: string
  amount: Decimal
  interval: SubscriptionInterval
  title?: string
  description?: string
}) {
  const merchant = await prisma.merchant.findUnique({
    where: { wallet: data.merchantWallet },
    select: { id: true },
  })
  if (!merchant) throw new ApiError(404, 'Merchant not found', NOT_FOUND)

  try {
    return await prisma.subscriptionPlan.create({
      data: {
        merchantId: merchant.id,
        token: data.token,
        amount: data.amount,
        interval: data.interval,
        active: true,
        title: data.title ?? null,
        description: data.description ?? null,
      },
    })
  } catch (e) {
    apiLogger.error('SubscriptionPlan create failed', e, { merchantWallet: data.merchantWallet })
    if (e instanceof Error && 'code' in e) {
      throw new ApiError(500, 'Could not create subscription plan', DB_CREATE_FAILED, { prismaCode: e.message })
    }
    throw new ApiError(500, 'Could not create subscription plan', DB_UNEXPECTED, { error: e })
  }
}

export async function getSubscriptionPlanById(id: string) {
  try {
    return await prisma.subscriptionPlan.findFirst({
      where: { id, archivedAt: null },
      include: {
        merchant: { select: { wallet: true, webhookUrl: true, webhookSecret: true } },
        _count: { select: { subscribers: { where: { status: SubscriptionStatus.active } } } },
      },
    })
  } catch (e) {
    apiLogger.error('SubscriptionPlan findUnique failed', e, { id })
    if (e instanceof Error && 'code' in e) {
      throw new ApiError(500, 'Database error', DB_QUERY_FAILED, { prismaCode: e.message })
    }
    throw new ApiError(500, 'Database error', DB_UNEXPECTED, { error: e })
  }
}

export async function getSubscriptionPlansByWallet(merchantWallet: string) {
  try {
    return await prisma.subscriptionPlan.findMany({
      where: { merchant: { wallet: merchantWallet }, archivedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { subscribers: { where: { status: SubscriptionStatus.active } } } },
      },
    })
  } catch (e) {
    apiLogger.error('SubscriptionPlan findMany by wallet failed', e, { merchantWallet })
    if (e instanceof Error && 'code' in e) {
      throw new ApiError(500, 'Database error', DB_QUERY_FAILED, { prismaCode: e.message })
    }
    throw new ApiError(500, 'Database error', DB_UNEXPECTED, { error: e })
  }
}

export async function archiveSubscriptionPlan(id: string, merchantWallet: string) {
  try {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id, archivedAt: null },
      include: { merchant: { select: { wallet: true } } },
    })
    if (!plan) throw new ApiError(404, 'Subscription plan not found', NOT_FOUND)
    if (plan.merchant.wallet !== merchantWallet) throw new ApiError(403, 'Not authorized', FORBIDDEN)
    await prisma.subscriptionPlan.update({ where: { id }, data: { archivedAt: new Date() } })
  } catch (e) {
    if (e instanceof ApiError) throw e
    apiLogger.error('SubscriptionPlan archive failed', e, { id })
    throw new ApiError(500, 'Could not archive subscription plan', DB_UNEXPECTED, { error: e })
  }
}

export async function updateSubscriptionPlanActive(id: string, merchantWallet: string, active: boolean) {
  try {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id },
      include: { merchant: { select: { wallet: true } } },
    })
    if (!plan) throw new ApiError(404, 'Subscription plan not found', NOT_FOUND)
    if (plan.merchant.wallet !== merchantWallet) throw new ApiError(403, 'Not authorized', FORBIDDEN)
    return await prisma.subscriptionPlan.update({ where: { id }, data: { active } })
  } catch (e) {
    if (e instanceof ApiError) throw e
    apiLogger.error('SubscriptionPlan update active failed', e, { id })
    throw new ApiError(500, 'Could not update subscription plan', DB_UPDATE_FAILED, { error: e })
  }
}

// ---------------------------------------------------------------------------
// Subscriber
// ---------------------------------------------------------------------------

export async function createSubscriber(data: {
  planId: string
  subscriberWallet: string
  firstPayment: {
    executionId: string
    txSignature: string
    inputToken: string
    inputAmount: bigint
    outputAmount: bigint
  }
}) {
  const plan = await prisma.subscriptionPlan.findFirst({
    where: { id: data.planId, archivedAt: null },
    select: { amount: true, token: true, interval: true },
  })
  if (!plan) throw new ApiError(404, 'Subscription plan not found', NOT_FOUND)

  const existing = await prisma.subscriber.findUnique({
    where: { planId_subscriberWallet: { planId: data.planId, subscriberWallet: data.subscriberWallet } },
    select: { id: true, status: true },
  })
  if (existing?.status === SubscriptionStatus.active) {
    throw new ApiError(409, 'Already subscribed to this plan', ALREADY_SUBSCRIBED)
  }

  const now = new Date()
  const currentPeriodEnd = nextPeriodEnd(now, plan.interval)

  try {
    return await prisma.$transaction(async (tx) => {
      // Upsert handles re-subscription (cancelled → active) via the unique constraint.
      const subscriber = await tx.subscriber.upsert({
        where: { planId_subscriberWallet: { planId: data.planId, subscriberWallet: data.subscriberWallet } },
        create: {
          planId: data.planId,
          subscriberWallet: data.subscriberWallet,
          status: SubscriptionStatus.active,
          currentPeriodEnd,
        },
        update: {
          status: SubscriptionStatus.active,
          currentPeriodEnd,
          cancelledAt: null,
        },
      })

      const renewal = await tx.subscriptionRenewal.create({
        data: {
          subscriberId: subscriber.id,
          amountSnapshot: plan.amount,
          tokenSnapshot: plan.token,
          periodStart: now,
          dueAt: now,
          status: RenewalStatus.succeeded,
          attemptCount: 1,
          executedAt: now,
        },
      })

      await tx.paymentExecution.create({
        data: {
          clientExecutionId: data.firstPayment.executionId,
          source: PaymentExecutionSource.subscription,
          renewalId: renewal.id,
          userWallet: data.subscriberWallet,
          inputToken: data.firstPayment.inputToken,
          inputAmount: data.firstPayment.inputAmount,
          outputAmount: data.firstPayment.outputAmount,
          txSignature: data.firstPayment.txSignature,
          status: PaymentExecutionStatus.paid,
        },
      })

      return subscriber
    })
  } catch (e) {
    apiLogger.error('Subscriber create failed', e, { planId: data.planId })
    if (e instanceof Error && 'code' in e) {
      throw new ApiError(500, 'Could not create subscription', DB_CREATE_FAILED, { prismaCode: e.message })
    }
    throw new ApiError(500, 'Could not create subscription', DB_UNEXPECTED, { error: e })
  }
}

export async function getSubscriberById(id: string) {
  try {
    return await prisma.subscriber.findUnique({
      where: { id },
      include: {
        plan: { select: { id: true, merchantId: true, merchant: { select: { wallet: true } }, token: true, amount: true, interval: true, title: true } },
        renewals: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { execution: { select: { txSignature: true, outputAmount: true, status: true } } },
        },
      },
    })
  } catch (e) {
    apiLogger.error('Subscriber findUnique failed', e, { id })
    if (e instanceof Error && 'code' in e) {
      throw new ApiError(500, 'Database error', DB_QUERY_FAILED, { prismaCode: e.message })
    }
    throw new ApiError(500, 'Database error', DB_UNEXPECTED, { error: e })
  }
}

export async function getSubscribersByMerchant(merchantWallet: string) {
  try {
    return await prisma.subscriber.findMany({
      where: { plan: { merchant: { wallet: merchantWallet }, archivedAt: null } },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: { select: { id: true, title: true, amount: true, token: true, interval: true } },
        renewals: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { execution: { select: { txSignature: true, outputAmount: true, status: true } } },
        },
      },
    })
  } catch (e) {
    apiLogger.error('Subscriber findMany by merchant failed', e, { merchantWallet })
    throw new ApiError(500, 'Database error', DB_UNEXPECTED, { error: e })
  }
}

export async function getSubscribersByWallet(subscriberWallet: string) {
  try {
    return await prisma.subscriber.findMany({
      where: { subscriberWallet },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: { select: { id: true, merchant: { select: { wallet: true } }, title: true, amount: true, token: true, interval: true } },
        renewals: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { execution: { select: { txSignature: true, status: true } } },
        },
      },
    })
  } catch (e) {
    apiLogger.error('Subscriber findMany by wallet failed', e, { subscriberWallet })
    throw new ApiError(500, 'Database error', DB_UNEXPECTED, { error: e })
  }
}

export async function cancelSubscriber(id: string, requestingWallet: string) {
  const subscriber = await getSubscriberById(id)
  if (!subscriber) throw new ApiError(404, 'Subscription not found', SUBSCRIPTION_NOT_FOUND)

  const isSubscriber = subscriber.subscriberWallet === requestingWallet
  const isMerchant = subscriber.plan.merchant.wallet === requestingWallet
  if (!isSubscriber && !isMerchant) throw new ApiError(403, 'Not authorized', FORBIDDEN)

  if (subscriber.status === SubscriptionStatus.cancelled) return subscriber

  try {
    return await prisma.subscriber.update({
      where: { id },
      data: { status: SubscriptionStatus.cancelled, cancelledAt: new Date() },
    })
  } catch (e) {
    apiLogger.error('Subscriber cancel failed', e, { id })
    if (e instanceof Error && 'code' in e) {
      throw new ApiError(500, 'Could not cancel subscription', DB_UPDATE_FAILED, { prismaCode: e.message })
    }
    throw new ApiError(500, 'Could not cancel subscription', DB_UNEXPECTED, { error: e })
  }
}
