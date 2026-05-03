import { SubscriptionStatus, RenewalStatus } from '@/lib/generated/prisma/client'
import { ApiError } from '@/lib/api/errors'
import {
  ALREADY_SUBSCRIBED,
  DB_CREATE_FAILED,
  DB_QUERY_FAILED,
  DB_UNEXPECTED,
  DB_UPDATE_FAILED,
  FORBIDDEN,
  SUBSCRIPTION_NOT_FOUND,
} from '@/lib/api/constants'
import { apiLogger } from '@/lib/api/logger'
import { prisma } from '@/lib/db'

function nextPeriodEnd(from: Date, interval: string): Date {
  const date = new Date(from)
  if (interval === 'weekly') date.setDate(date.getDate() + 7)
  else if (interval === 'monthly') date.setMonth(date.getMonth() + 1)
  else if (interval === 'yearly') date.setFullYear(date.getFullYear() + 1)
  return date
}

export async function createSubscription(data: {
  linkId: string
  subscriberWallet: string
  interval: string
  txSignature: string
}) {
  const existing = await prisma.subscription.findUnique({
    where: { linkId_subscriberWallet: { linkId: data.linkId, subscriberWallet: data.subscriberWallet } },
    select: { id: true, status: true },
  })

  if (existing && existing.status === SubscriptionStatus.active) {
    throw new ApiError(409, 'Already subscribed to this plan', ALREADY_SUBSCRIBED)
  }

  const now = new Date()
  const currentPeriodEnd = nextPeriodEnd(now, data.interval)

  try {
    return await prisma.subscription.upsert({
      where: { linkId_subscriberWallet: { linkId: data.linkId, subscriberWallet: data.subscriberWallet } },
      create: {
        linkId: data.linkId,
        subscriberWallet: data.subscriberWallet,
        status: SubscriptionStatus.active,
        currentPeriodEnd,
        renewals: {
          create: {
            status: RenewalStatus.succeeded,
            txSignature: data.txSignature,
            dueAt: now,
            executedAt: now,
            attemptCount: 1,
          },
        },
      },
      update: {
        status: SubscriptionStatus.active,
        currentPeriodEnd,
        cancelledAt: null,
        renewals: {
          create: {
            status: RenewalStatus.succeeded,
            txSignature: data.txSignature,
            dueAt: now,
            executedAt: now,
            attemptCount: 1,
          },
        },
      },
      include: { renewals: { orderBy: { createdAt: 'desc' }, take: 1 } },
    })
  } catch (e) {
    apiLogger.error('Subscription create failed', e, { linkId: data.linkId })
    if (e instanceof Error && 'code' in e) {
      throw new ApiError(500, 'Could not create subscription', DB_CREATE_FAILED, { prismaCode: e.message })
    }
    throw new ApiError(500, 'Could not create subscription', DB_UNEXPECTED, { error: e })
  }
}

export async function getSubscriptionById(id: string) {
  try {
    return await prisma.subscription.findUnique({
      where: { id },
      include: {
        link: { select: { merchantWallet: true, token: true, amount: true, interval: true, title: true } },
        renewals: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    })
  } catch (e) {
    apiLogger.error('Subscription findUnique failed', e, { id })
    if (e instanceof Error && 'code' in e) {
      throw new ApiError(500, 'Database error', DB_QUERY_FAILED, { prismaCode: e.message })
    }
    throw new ApiError(500, 'Database error', DB_UNEXPECTED, { error: e })
  }
}

export async function getSubscriptionsByMerchant(merchantWallet: string) {
  try {
    return await prisma.subscription.findMany({
      where: { link: { merchantWallet, archivedAt: null } },
      orderBy: { createdAt: 'desc' },
      include: {
        link: { select: { token: true, amount: true, interval: true, title: true } },
        renewals: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })
  } catch (e) {
    apiLogger.error('Subscription findMany by merchant failed', e, { merchantWallet })
    throw new ApiError(500, 'Database error', DB_UNEXPECTED, { error: e })
  }
}

export async function getSubscriptionsBySubscriber(subscriberWallet: string) {
  try {
    return await prisma.subscription.findMany({
      where: { subscriberWallet },
      orderBy: { createdAt: 'desc' },
      include: {
        link: { select: { merchantWallet: true, token: true, amount: true, interval: true, title: true } },
        renewals: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })
  } catch (e) {
    apiLogger.error('Subscription findMany by subscriber failed', e, { subscriberWallet })
    throw new ApiError(500, 'Database error', DB_UNEXPECTED, { error: e })
  }
}

export async function cancelSubscription(id: string, requestingWallet: string) {
  const subscription = await getSubscriptionById(id)
  if (!subscription) throw new ApiError(404, 'Subscription not found', SUBSCRIPTION_NOT_FOUND)

  const isSubscriber = subscription.subscriberWallet === requestingWallet
  const isMerchant = subscription.link.merchantWallet === requestingWallet
  if (!isSubscriber && !isMerchant) throw new ApiError(403, 'Not authorized', FORBIDDEN)

  if (subscription.status === SubscriptionStatus.cancelled) {
    return subscription
  }

  try {
    return await prisma.subscription.update({
      where: { id },
      data: { status: SubscriptionStatus.cancelled, cancelledAt: new Date() },
    })
  } catch (e) {
    apiLogger.error('Subscription cancel failed', e, { id })
    if (e instanceof Error && 'code' in e) {
      throw new ApiError(500, 'Could not cancel subscription', DB_UPDATE_FAILED, { prismaCode: e.message })
    }
    throw new ApiError(500, 'Could not cancel subscription', DB_UNEXPECTED, { error: e })
  }
}
