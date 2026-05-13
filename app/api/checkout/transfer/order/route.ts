import { NextResponse } from 'next/server'
import { PublicKey } from '@solana/web3.js'

import { VALIDATION } from '@/lib/api/constants'
import { handleApi, readJsonBody, UpstreamError } from '@/lib/api/errors'
import { createServerConnection } from '@/lib/solana/connection'
import { parseCluster, getDefaultUsdcMint } from '@/lib/solana/constants'
import { getExactOutOrder } from '@/lib/solana/jupiter'
import { buildDirectSettlementPaymentTx } from '@/lib/solana/txBuilder'
import { toRawUsdc } from '@/lib/solana/amount'
import { directPayOrderBody } from '@/lib/validation'

const USDC_MINT = getDefaultUsdcMint(parseCluster(process.env.NEXT_PUBLIC_SOLANA_NETWORK))

export async function POST(req: Request) {
  return handleApi(async () => {
    const json = await readJsonBody(req)
    const parsed = directPayOrderBody.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: VALIDATION, issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const { inputMint, taker, receiverWallet, amount } = parsed.data
    const rawOut = toRawUsdc(amount)

    // Same-mint: direct SPL transfer, no Jupiter swap.
    if (inputMint === USDC_MINT) {
      const connection = createServerConnection()
      const mint = new PublicKey(USDC_MINT)
      const tx = await buildDirectSettlementPaymentTx({
        connection,
        payer: new PublicKey(taker),
        merchant: new PublicKey(receiverWallet),
        settlementMint: mint,
        transferAmountRaw: rawOut,
        mintDecimals: 6,
        // No linkId — this is an ad-hoc send, not a payment link
      })
      return NextResponse.json({
        transaction: Buffer.from(tx.serialize()).toString('base64'),
        inAmount: rawOut.toString(),
        outAmount: rawOut.toString(),
        inputMint: USDC_MINT,
        outputMint: USDC_MINT,
        requestId: null,
        isDirect: true,
      })
    }

    // Jupiter ExactOut swap: buyer's token → USDC lands at receiverWallet.
    try {
      const order = await getExactOutOrder(inputMint, USDC_MINT, rawOut, taker, receiverWallet)
      return NextResponse.json({
        transaction: order.transaction,
        inAmount: order.inAmount,
        outAmount: order.outAmount,
        inputMint: order.inputMint,
        outputMint: order.outputMint,
        requestId: order.requestId,
        isDirect: false,
      })
    } catch (e) {
      throw new UpstreamError(e instanceof Error ? e.message : 'Jupiter order failed')
    }
  })
}
