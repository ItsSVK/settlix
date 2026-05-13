import { NextResponse } from 'next/server'

import { VALIDATION } from '@/lib/api/constants'
import { handleApi, readJsonBody } from '@/lib/api/errors'
import { UpstreamError } from '@/lib/api/errors'
import { getExactOutQuote } from '@/lib/solana/jupiter'
import { parseCluster, getDefaultUsdcMint } from '@/lib/solana/constants'
import { toRawUsdc } from '@/lib/solana/amount'
import { directPayQuoteBody } from '@/lib/validation'

const USDC_MINT = getDefaultUsdcMint(parseCluster(process.env.NEXT_PUBLIC_SOLANA_NETWORK))

export async function POST(req: Request) {
  return handleApi(async () => {
    const json = await readJsonBody(req)
    const parsed = directPayQuoteBody.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: VALIDATION, issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const { inputMint, amount } = parsed.data
    const rawOut = toRawUsdc(amount)

    // Same-mint: buyer is already paying in USDC — synthetic 1:1 quote, no Jupiter call.
    if (inputMint === USDC_MINT) {
      return NextResponse.json({
        inAmount: rawOut.toString(),
        outAmount: rawOut.toString(),
        inputMint: USDC_MINT,
        outputMint: USDC_MINT,
        isDirect: true,
      })
    }

    try {
      const q = await getExactOutQuote(inputMint, USDC_MINT, rawOut)
      return NextResponse.json({
        inAmount: q.inAmount,
        outAmount: q.outAmount,
        inputMint: q.inputMint,
        outputMint: q.outputMint,
        isDirect: false,
      })
    } catch (e) {
      throw new UpstreamError(e instanceof Error ? e.message : 'Jupiter quote failed')
    }
  })
}
