import { ApiError, UpstreamError } from '@/lib/api/errors'
import { apiLogger } from '@/lib/api/logger'
import { decimalToBigIntUSDC } from '@/lib/solana/amount'
import { getPaymentLinkByDetails } from '@/lib/solana/database-lookup'
import { getExactOutOrder } from '@/lib/solana/jupiter'
import type { JupiterOrderBody } from '@/lib/validation'

export async function executeJupiterOrderRequest(body: JupiterOrderBody) {
  try {
    const pay = await getPaymentLinkByDetails(body.payId) // TODO: change this to get exact out quote if inputMint is not USDC
    return await getExactOutOrder(body.inputMint, pay.token, decimalToBigIntUSDC(pay.amount), body.taker)
  } catch (e) {
    if (e instanceof ApiError) throw e
    const msg = e instanceof Error ? e.message : 'Jupiter order failed'
    apiLogger.warn('Jupiter swap order failed', {
      error: msg,
      inputMint: body.inputMint,
    })
    throw new UpstreamError(msg)
  }
}
