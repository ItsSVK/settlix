import { ApiError } from '@/lib/api/errors'
import { DB_QUERY_FAILED, DB_UPDATE_FAILED, DB_UNEXPECTED } from '@/lib/api/constants'
import { apiLogger } from '@/lib/api/logger'
import { prisma } from '@/lib/db'

export async function getMerchantWebhook(wallet: string) {
  try {
    return await prisma.merchant.findUnique({
      where: { wallet },
      select: { webhookUrl: true, webhookSecret: true },
    })
  } catch (e) {
    apiLogger.error('Merchant webhook fetch failed', e, { wallet })
    throw new ApiError(500, 'Database error', DB_QUERY_FAILED)
  }
}

export async function upsertMerchantWebhook(
  wallet: string,
  params: { webhookUrl: string | null; webhookSecret?: string; replaceSecret: boolean },
) {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { wallet },
      select: { webhookSecret: true },
    })

    const nextSecret = params.webhookUrl
      ? params.replaceSecret
        ? (params.webhookSecret ?? null)
        : (merchant?.webhookSecret ?? null)
      : null

    return await prisma.merchant.update({
      where: { wallet },
      data: { webhookUrl: params.webhookUrl, webhookSecret: nextSecret },
      select: { webhookUrl: true, webhookSecret: true },
    })
  } catch (e) {
    apiLogger.error('Merchant webhook upsert failed', e, { wallet })
    if (e instanceof Error && 'message' in e) {
      throw new ApiError(500, 'Could not update webhook', DB_UPDATE_FAILED, { error: e.message })
    }
    throw new ApiError(500, 'Could not update webhook', DB_UNEXPECTED)
  }
}
