import { ApiError, UpstreamError } from '@/lib/api/errors'
import { apiLogger } from '@/lib/api/logger'
import { getPaymentLinkByDetails, getInvoicePayDetails } from '@/lib/solana/database-lookup'
import { getExactOutQuote } from '@/lib/solana/jupiter'
import type { JupiterQuoteBody } from '@/lib/validation'
import { decimalToBigIntUSDC } from '@/lib/solana/amount'

export async function executeJupiterQuoteRequest(body: JupiterQuoteBody) {
  try {
    const pay = body.invoiceId ? await getInvoicePayDetails(body.invoiceId) : await getPaymentLinkByDetails(body.payId!)
    const rawOut = decimalToBigIntUSDC(pay.amount)

    // Same-mint shortcut — buyer is paying with the exact settlement token.
    // Jupiter rejects same-mint requests, so return a synthetic 1:1 quote immediately.
    if (body.inputMint === pay.token) {
      return {
        inAmount: rawOut.toString(),
        outAmount: rawOut.toString(),
        inputMint: pay.token,
        outputMint: pay.token,
        requestId: null, // not needed for direct-transfer path
        isDirect: true,
      }
    }

    const q = await getExactOutQuote(body.inputMint, pay.token, rawOut)
    return {
      inAmount: q.inAmount,
      outAmount: q.outAmount,
      inputMint: q.inputMint,
      outputMint: q.outputMint,
      requestId: q.requestId,
      isDirect: false,
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
