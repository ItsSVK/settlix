import { type NextRequest, NextResponse } from 'next/server'

import { handleApi } from '@/lib/api/errors'
import { requireAuth } from '@/lib/auth/require-auth'
import { cancelSubscriber } from '@/lib/services/subscription.service'

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/subscriptions/[id]/cancel
 *
 * Cancels an active subscription. Allowed by the subscriber or the merchant.
 * Does not revoke the on-chain SPL token delegation — the subscriber can do
 * that manually via their wallet if desired.
 */
export async function POST(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const { wallet } = await requireAuth(req)
    const { id } = await params

    await cancelSubscriber(id, wallet)

    return new NextResponse(null, { status: 204 })
  })
}
