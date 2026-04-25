import { type NextRequest, NextResponse } from 'next/server'

import { NOT_FOUND, VALIDATION } from '@/lib/api/constants'
import { handleApi, readJsonBody } from '@/lib/api/errors'
import { requireAuth } from '@/lib/auth/require-auth'
import { upsertPaymentLinkWebhook } from '@/lib/services/payment-link.service'
import { paymentLinkId, paymentLinkWebhookBody } from '@/lib/validation'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const { wallet } = await requireAuth(req)

    const { id } = await params
    const parsedId = paymentLinkId.safeParse(id)
    if (!parsedId.success) {
      return NextResponse.json({ error: 'Not found', code: NOT_FOUND }, { status: 404 })
    }

    const json = await readJsonBody(req)
    const parsed = paymentLinkWebhookBody.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: VALIDATION, issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const updated = await upsertPaymentLinkWebhook({
      id: parsedId.data,
      merchantWallet: wallet,
      webhookUrl: parsed.data.webhookUrl ?? null,
      webhookSecret: parsed.data.webhookSecret,
      replaceSecret: parsed.data.webhookSecret !== undefined,
    })

    return NextResponse.json({
      id: updated.id,
      webhookUrl: updated.webhookUrl,
      hasWebhookSecret: Boolean(updated.webhookSecret),
    })
  })
}
