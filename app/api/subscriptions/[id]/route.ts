import { type NextRequest, NextResponse } from 'next/server'

import { ApiError, handleApi } from '@/lib/api/errors'
import { SUBSCRIPTION_NOT_FOUND } from '@/lib/api/constants'
import { getSubscriberById } from '@/lib/services/subscription.service'

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/subscriptions/[id]
 *
 * Public endpoint — subscription IDs are unguessable CUIDs, so possession of
 * the ID is sufficient proof. Used by the subscriber-facing manage page.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params

    const sub = await getSubscriberById(id)
    if (!sub) throw new ApiError(404, 'Subscription not found', SUBSCRIPTION_NOT_FOUND)

    return NextResponse.json({
      id: sub.id,
      planId: sub.planId,
      subscriberWallet: sub.subscriberWallet,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
      cancelledAt: sub.cancelledAt?.toISOString() ?? null,
      createdAt: sub.createdAt.toISOString(),
      plan: {
        title: sub.plan.title ?? null,
        amount: sub.plan.amount.toString(),
        token: sub.plan.token,
        interval: sub.plan.interval,
        merchantWallet: sub.plan.merchant.wallet,
      },
      renewals: sub.renewals.map((r) => ({
        id: r.id,
        status: r.status,
        txSignature: r.execution?.txSignature ?? null,
        dueAt: r.dueAt.toISOString(),
        executedAt: r.executedAt?.toISOString() ?? null,
        failureReason: r.failureReason ?? null,
        attemptCount: r.attemptCount,
      })),
    })
  })
}
