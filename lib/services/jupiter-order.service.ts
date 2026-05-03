import { PublicKey } from '@solana/web3.js'
import { ApiError, UpstreamError } from '@/lib/api/errors'
import { apiLogger } from '@/lib/api/logger'
import { decimalToBigIntUSDC } from '@/lib/solana/amount'
import { createServerConnection } from '@/lib/solana/connection'
import { getPaymentLinkByDetails, getInvoicePayDetails } from '@/lib/solana/database-lookup'
import { getExactOutOrder } from '@/lib/solana/jupiter'
import { buildDirectSettlementPaymentTx } from '@/lib/solana/txBuilder'
import type { JupiterOrderBody } from '@/lib/validation'

export async function executeJupiterOrderRequest(body: JupiterOrderBody) {
  try {
    const pay = body.invoiceId
      ? await getInvoicePayDetails(body.invoiceId)
      : await getPaymentLinkByDetails(body.payId!)
    const rawOut = decimalToBigIntUSDC(pay.amount)

    // ── Same-mint shortcut ────────────────────────────────────────────────────
    // Buyer is paying with the exact settlement token (e.g. USDC → USDC).
    // Jupiter rejects same-mint swaps; build a direct SPL transferChecked instead.
    if (body.inputMint === pay.token) {
      const connection = createServerConnection()
      const mint = new PublicKey(pay.token)

      // We need mintDecimals — infer from the settlement token.
      // USDC is 6 decimals; for any future token, this will be read on-chain.
      const mintInfo = await connection.getParsedAccountInfo(mint)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mintDecimals: number = (mintInfo.value?.data as any)?.parsed?.info?.decimals ?? 6

      const tx = await buildDirectSettlementPaymentTx({
        connection,
        payer: new PublicKey(body.taker),
        merchant: new PublicKey(pay.merchant.wallet),
        settlementMint: mint,
        transferAmountRaw: rawOut,
        mintDecimals,
        linkId: body.payId ?? body.invoiceId,
      })

      return {
        transaction: Buffer.from(tx.serialize()).toString('base64'),
        inAmount: rawOut.toString(),
        outAmount: rawOut.toString(),
        inputMint: pay.token,
        outputMint: pay.token,
        requestId: null, // no Jupiter requestId — direct send to RPC
        isDirect: true, // tells the frontend to call /api/solana/send instead of /execute
      }
    }

    // ── Normal Jupiter swap ────────────────────────────────────────────────────
    const order = await getExactOutOrder(body.inputMint, pay.token, rawOut, body.taker, pay.merchant.wallet)
    return {
      transaction: order.transaction,
      inAmount: order.inAmount,
      outAmount: order.outAmount,
      inputMint: order.inputMint,
      outputMint: order.outputMint,
      requestId: order.requestId,
      isDirect: false,
    }
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
