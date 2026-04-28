import { type NextRequest, NextResponse } from 'next/server'

import { handleApi, readJsonBody } from '@/lib/api/errors'
import { requireAuth } from '@/lib/auth/require-auth'
import { VALIDATION } from '@/lib/api/constants'
import { paymentLinkWebhookBody } from '@/lib/validation'
import { getMerchantWebhook, upsertMerchantWebhook } from '@/lib/services/merchant.service'

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const { wallet } = await requireAuth(req)
    const webhook = await getMerchantWebhook(wallet)
    return NextResponse.json({
      webhookUrl: webhook?.webhookUrl ?? null,
      hasWebhookSecret: Boolean(webhook?.webhookSecret),
    })
  })
}

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const { wallet } = await requireAuth(req)

    const json = await readJsonBody(req)
    const parsed = paymentLinkWebhookBody.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: VALIDATION, issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const updated = await upsertMerchantWebhook(wallet, {
      webhookUrl: parsed.data.webhookUrl ?? null,
      webhookSecret: parsed.data.webhookSecret,
      replaceSecret: parsed.data.webhookSecret !== undefined,
    })

    return NextResponse.json({
      webhookUrl: updated.webhookUrl ?? null,
      hasWebhookSecret: Boolean(updated.webhookSecret),
    })
  })
}
