import { createHmac } from 'node:crypto'

import { apiLogger } from '@/lib/api/logger'

export interface PaymentWebhookPayload {
  // Exactly one of linkId / invoiceId / subscriberId will be present.
  linkId?: string
  invoiceId?: string
  subscriberId?: string
  planId?: string
  txSignature: string
  inputToken: string
  inputAmount: string
  outputAmount: string
  userWallet: string
  timestamp: string
  metadata?: Record<string, unknown> | null
  test?: boolean
}

export type WebhookDeliveryResult = { ok: true } | { ok: false; error: string }

export async function deliverPaymentWebhook(config: {
  webhookUrl: string
  webhookSecret?: string | null
  payload: PaymentWebhookPayload
}): Promise<WebhookDeliveryResult> {
  const body = JSON.stringify(config.payload)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (config.webhookSecret) {
    headers['X-Settlix-Signature'] = `sha256=${createHmac('sha256', config.webhookSecret).update(body).digest('hex')}`
  }

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      const responsePreview = (await response.text().catch(() => '')).slice(0, 200)
      apiLogger.warn('Payment webhook delivery failed', {
        linkId: config.payload.linkId,
        txSignature: config.payload.txSignature,
        webhookUrl: config.webhookUrl,
        status: response.status,
        responsePreview,
      })
      return { ok: false, error: `Endpoint responded ${response.status}` }
    }

    apiLogger.info('Payment webhook delivered', {
      linkId: config.payload.linkId,
      txSignature: config.payload.txSignature,
      webhookUrl: config.webhookUrl,
      signed: Boolean(config.webhookSecret),
    })
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    apiLogger.warn('Payment webhook delivery failed', {
      linkId: config.payload.linkId,
      txSignature: config.payload.txSignature,
      webhookUrl: config.webhookUrl,
      error: message,
    })
    return { ok: false, error: message }
  }
}
