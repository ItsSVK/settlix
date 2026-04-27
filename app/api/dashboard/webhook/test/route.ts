import { randomBytes } from 'node:crypto'
import { type NextRequest, NextResponse } from 'next/server'

import { handleApi, readJsonBody } from '@/lib/api/errors'
import { requireAuth } from '@/lib/auth/require-auth'
import { VALIDATION } from '@/lib/api/constants'
import { webhookTestBody } from '@/lib/validation'
import { deliverPaymentWebhook } from '@/lib/services/payment-webhook.service'

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const { wallet } = await requireAuth(req)

    const json = await readJsonBody(req)
    const parsed = webhookTestBody.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', code: VALIDATION, issues: parsed.error.issues }, { status: 400 })
    }

    const result = await deliverPaymentWebhook({
      webhookUrl: parsed.data.webhookUrl,
      webhookSecret: parsed.data.webhookSecret ?? null,
      payload: {
        linkId: `test_${randomBytes(6).toString('hex')}`,
        txSignature: `test_${randomBytes(12).toString('hex')}`,
        inputToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        inputAmount: '1000000',
        outputAmount: '1000000',
        userWallet: wallet,
        timestamp: new Date().toISOString(),
        test: true,
      },
    })

    return NextResponse.json(result)
  })
}
