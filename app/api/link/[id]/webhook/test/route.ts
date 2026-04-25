import { randomBytes } from 'node:crypto'
import { type NextRequest, NextResponse } from 'next/server'

import { NOT_FOUND, VALIDATION } from '@/lib/api/constants'
import { handleApi, readJsonBody } from '@/lib/api/errors'
import { requireAuth } from '@/lib/auth/require-auth'
import { getPaymentLinkById } from '@/lib/services/payment-link.service'
import { deliverPaymentWebhook } from '@/lib/services/payment-webhook.service'
import { paymentLinkId, webhookTestBody } from '@/lib/validation'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const { wallet } = await requireAuth(req)

    const { id } = await params
    const parsedId = paymentLinkId.safeParse(id)
    if (!parsedId.success) {
      return NextResponse.json({ error: 'Not found', code: NOT_FOUND }, { status: 404 })
    }

    const link = await getPaymentLinkById(parsedId.data)
    if (!link) {
      return NextResponse.json({ error: 'Not found', code: NOT_FOUND }, { status: 404 })
    }
    if (link.merchantWallet !== wallet) {
      return NextResponse.json({ error: 'Not found', code: NOT_FOUND }, { status: 404 })
    }

    const json = await readJsonBody(req)
    const parsed = webhookTestBody.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: VALIDATION, issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const result = await deliverPaymentWebhook({
      webhookUrl: parsed.data.webhookUrl,
      webhookSecret: parsed.data.webhookSecret ?? null,
      payload: {
        linkId: parsedId.data,
        txSignature: `test_${randomBytes(12).toString('hex')}`,
        inputToken: link.token,
        inputAmount: '1000000',
        outputAmount: '1000000',
        userWallet: link.merchantWallet,
        timestamp: new Date().toISOString(),
        test: true,
      },
    })

    return NextResponse.json(result)
  })
}
