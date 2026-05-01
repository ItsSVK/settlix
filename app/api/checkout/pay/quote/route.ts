import { NextResponse } from 'next/server'

import { handleApi, readJsonBody } from '@/lib/api/errors'
import { executeJupiterQuoteRequest } from '@/lib/services/jupiter-quote.service'
import { jupiterQuoteBody } from '@/lib/validation'
import { VALIDATION } from '@/lib/api/constants'

export async function POST(req: Request) {
  return handleApi(async () => {
    const json = await readJsonBody(req)
    const parsed = jupiterQuoteBody.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: VALIDATION, issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const quote = await executeJupiterQuoteRequest(parsed.data)

    return NextResponse.json({
      inAmount: quote.inAmount,
      outAmount: quote.outAmount,
      inputMint: quote.inputMint,
      outputMint: quote.outputMint,
      requestId: quote.requestId,
    })
  })
}
