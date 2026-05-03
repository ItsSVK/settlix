import { type NextRequest, NextResponse } from 'next/server'

import { ApiError, handleApi, readJsonBody } from '@/lib/api/errors'
import { getPaymentLinkById, updatePaymentLinkActive, archivePaymentLink } from '@/lib/services/payment-link.service'
import { FORBIDDEN, LINK_EXPIRED, LINK_SOLD_OUT, NOT_FOUND, VALIDATION } from '@/lib/api/constants'
import { paymentLinkId, updateLinkActiveBody } from '@/lib/validation'
import { requireAuth } from '@/lib/auth/require-auth'

type Params = { params: Promise<{ id: string }> }

/** GET /api/links/[id] — public endpoint used by buyers */
export async function GET(_req: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params
    const parsedId = paymentLinkId.safeParse(id)

    if (!parsedId.success) {
      return NextResponse.json({ error: 'Not found', code: NOT_FOUND }, { status: 404 })
    }

    const link = await getPaymentLinkById(parsedId.data)

    if (!link || !link.active) {
      return NextResponse.json({ error: 'Not found', code: NOT_FOUND }, { status: 404 })
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Link expired', code: LINK_EXPIRED }, { status: 410 })
    }

    if (link.maxUses && link._count.executions >= link.maxUses) {
      return NextResponse.json({ error: 'Link sold out', code: LINK_SOLD_OUT }, { status: 410 })
    }

    return NextResponse.json({
      id: link.id,
      merchantWallet: link.merchantWallet,
      token: link.token,
      amount: link.amount.toString(),
      type: link.type,
      interval: link.interval ?? null,
      title: link.title ?? null,
      description: link.description ?? null,
      createdAt: link.createdAt.toISOString(),
      recipients: (link.recipients ?? []).map((r) => ({
        wallet: r.wallet,
        basisPoints: r.basisPoints,
      })),
    })
  })
}

/** DELETE /api/links/[id] — protected, merchant only */
export async function DELETE(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const { wallet } = await requireAuth(req)
    const { id } = await params
    const parsedId = paymentLinkId.safeParse(id)
    if (!parsedId.success) {
      return NextResponse.json({ error: 'Not found', code: NOT_FOUND }, { status: 404 })
    }
    await archivePaymentLink(parsedId.data, wallet)
    return new NextResponse(null, { status: 204 })
  })
}

/** PATCH /api/links/[id] — protected, merchant only */
export async function PATCH(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    // Authenticate the merchant
    const { wallet } = await requireAuth(req)

    const { id } = await params
    const parsedId = paymentLinkId.safeParse(id)
    if (!parsedId.success) {
      return NextResponse.json({ error: 'Not found', code: NOT_FOUND }, { status: 404 })
    }

    const json = await readJsonBody(req)
    const parsed = updateLinkActiveBody.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: VALIDATION, issues: parsed.error.issues },
        { status: 400 },
      )
    }

    // Ownership check: make sure the authenticated wallet owns this link
    const link = await getPaymentLinkById(parsedId.data)
    if (!link) {
      return NextResponse.json({ error: 'Not found', code: NOT_FOUND }, { status: 404 })
    }
    if (link.merchantWallet !== wallet) {
      throw new ApiError(403, 'You do not own this payment link', FORBIDDEN)
    }

    const updated = await updatePaymentLinkActive(parsedId.data, wallet, parsed.data.active)

    return NextResponse.json({
      id: updated.id,
      active: updated.active,
    })
  })
}
