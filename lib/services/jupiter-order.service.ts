import { ApiError, UpstreamError } from '@/lib/api/errors'
import { apiLogger } from '@/lib/api/logger'
import { getExactOutOrder } from '@/lib/solana/jupiter'
import type { JupiterOrderBody } from '@/lib/validation'

export async function executeJupiterOrderRequest(body: JupiterOrderBody) {
  try {
    return await getExactOutOrder(body.inputMint, body.outputMint, BigInt(body.targetOutRaw), body.taker)
  } catch (e) {
    if (e instanceof ApiError) throw e
    const msg = e instanceof Error ? e.message : 'Jupiter order failed'
    apiLogger.warn('Jupiter swap order failed', {
      error: msg,
      inputMint: body.inputMint,
      outputMint: body.outputMint,
    })
    throw new UpstreamError(msg)
  }
}
