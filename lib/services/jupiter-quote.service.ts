import { ApiError, UpstreamError } from '@/lib/api/errors'
import { apiLogger } from '@/lib/api/logger'
import { getPaymentLinkByDetails } from '@/lib/solana/database-lookup'
import { getExactOutQuote } from '@/lib/solana/jupiter'
import type { JupiterQuoteBody } from '@/lib/validation'
import { decimalToBigIntUSDC } from '@/lib/solana/amount'

export async function executeJupiterQuoteRequest(body: JupiterQuoteBody) {
  try {
    const pay = await getPaymentLinkByDetails(body.payId) // TODO: change this to get exact out quote if inputMint is not USDC
    const q = await getExactOutQuote(body.inputMint, pay.token, decimalToBigIntUSDC(pay.amount))
    return {
      inAmount: q.inAmount,
      outAmount: q.outAmount,
      inputMint: q.inputMint,
      outputMint: q.outputMint,
      requestId: q.requestId,
    }
  } catch (e) {
    if (e instanceof ApiError) throw e
    const msg = e instanceof Error ? e.message : 'Jupiter quote failed'
    apiLogger.warn('Jupiter quote failed', {
      error: msg,
      inputMint: body.inputMint,
    })
    throw new UpstreamError(msg)
  }
}
