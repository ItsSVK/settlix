import { type NextRequest, NextResponse } from 'next/server'

import { ApiError, handleApi } from '@/lib/api/errors'
import { SUBSCRIPTION_NOT_FOUND } from '@/lib/api/constants'
import { getSubscriptionById } from '@/lib/services/subscription.service'
import { requireAuth } from '@/lib/auth/require-auth'

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/subscriptions/[id]
 *
 * Returns subscription details. Accessible by the subscriber or merchant.
 */
export async function GET(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const { wallet } = await requireAuth(req)
    const { id } = await params

    const sub = await getSubscriptionById(id)
    if (!sub) throw new ApiError(404, 'Subscription not found', SUBSCRIPTION_NOT_FOUND)

    const isSubscriber = sub.subscriberWallet === wallet
    const isMerchant = sub.link.merchantWallet === wallet
    if (!isSubscriber && !isMerchant) throw new ApiError(403, 'Not authorized', 'FORBIDDEN')

    return NextResponse.json({
      id: sub.id,
      linkId: sub.linkId,
      subscriberWallet: sub.subscriberWallet,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
      cancelledAt: sub.cancelledAt?.toISOString() ?? null,
      createdAt: sub.createdAt.toISOString(),
      plan: {
        title: sub.link.title ?? null,
        amount: sub.link.amount.toString(),
        token: sub.link.token,
        interval: sub.link.interval,
        merchantWallet: sub.link.merchantWallet,
      },
      renewals: sub.renewals.map((r) => ({
        id: r.id,
        status: r.status,
        txSignature: r.txSignature,
        dueAt: r.dueAt.toISOString(),
        executedAt: r.executedAt?.toISOString() ?? null,
        failureReason: r.failureReason ?? null,
        attemptCount: r.attemptCount,
      })),
    })
  })
}
