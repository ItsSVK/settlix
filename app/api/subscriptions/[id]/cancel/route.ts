import { type NextRequest, NextResponse } from 'next/server'

import { ApiError, handleApi, readJsonBody } from '@/lib/api/errors'
import { UNAUTHORIZED } from '@/lib/api/constants'
import { getSessionFromRequest } from '@/lib/auth/session'
import { cancelSubscriber, getSubscriberById } from '@/lib/services/subscription.service'
import { sendSubscriptionUserCancelledEmail } from '@/lib/services/subscription-renewal.service'

type Params = { params: Promise<{ id: string }> }

type SubscriberWithPlan = NonNullable<Awaited<ReturnType<typeof getSubscriberById>>>

async function fireCancelEmail(sub: SubscriberWithPlan) {
  await sendSubscriptionUserCancelledEmail({
    subscriberEmail: sub.subscriberEmail,
    subscriberName: sub.subscriberName,
    planTitle: sub.plan.title,
    planId: sub.plan.id,
    amount: sub.plan.amount.toString(),
    token: sub.plan.token,
    interval: sub.plan.interval,
    accessUntil: sub.currentPeriodEnd.toISOString(),
  })
}

/**
 * POST /api/subscriptions/[id]/cancel
 *
 * Cancels an active subscription. Two auth paths:
 *   1. Merchant / API key — uses session or Bearer token (requireAuth flow).
 *   2. Subscriber self-cancel — passes { walletAddress } in the JSON body.
 *      Authorization is enforced in cancelSubscriber (wallet must match subscriber).
 *
 * Does not revoke the on-chain SPL delegation — subscriber can do that via wallet.
 */
export async function POST(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params

    // Fetch subscriber before cancelling so we have email/plan data for the notification
    const sub = await getSubscriberById(id)

    // Try session / API key first (merchant dashboard path)
    const session = await getSessionFromRequest(req)
    if (session) {
      await cancelSubscriber(id, session.wallet)
      if (sub) void fireCancelEmail(sub)
      return new NextResponse(null, { status: 204 })
    }

    // Subscriber self-cancel: wallet address provided in body
    const body = await readJsonBody(req).catch(() => null) as Record<string, unknown> | null
    const walletAddress = typeof body?.walletAddress === 'string' ? body.walletAddress.trim() : null
    if (!walletAddress) {
      throw new ApiError(401, 'Provide a session or walletAddress in the request body', UNAUTHORIZED)
    }

    await cancelSubscriber(id, walletAddress)
    if (sub) void fireCancelEmail(sub)
    return new NextResponse(null, { status: 204 })
  })
}
