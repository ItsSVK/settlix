import { DB_QUERY_FAILED, DB_CREATE_FAILED } from '@/lib/api/constants'
import { ApiError } from '@/lib/api/errors'
import { apiLogger } from '@/lib/api/logger'
import { prisma } from '@/lib/db'

export async function getApiKeysByWallet(wallet: string) {
  try {
    return await prisma.apiKey.findMany({
      where: { merchant: { wallet } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, lastUsedAt: true, createdAt: true },
    })
  } catch (e) {
    apiLogger.error('Merchant API keys fetch failed', e, { wallet })
    throw new ApiError(500, 'Database error', DB_QUERY_FAILED)
  }
}

export async function createApiKey(data: { wallet: string; name: string; keyHash: string }) {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { wallet: data.wallet },
      select: { id: true },
    })
    if (!merchant) throw new ApiError(404, 'Merchant not found', 'NOT_FOUND')

    return await prisma.apiKey.create({
      data: { merchantId: merchant.id, keyHash: data.keyHash, name: data.name },
      select: { id: true, name: true, createdAt: true },
    })
  } catch (e) {
    if (e instanceof ApiError) throw e
    apiLogger.error('API key creation failed', e, { wallet: data.wallet })
    throw new ApiError(500, 'Database error', DB_CREATE_FAILED)
  }
}
