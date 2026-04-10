import { NextResponse } from 'next/server'

import { handleApi, readJsonBody } from '@/lib/api/errors'
import { executeSwap } from '@/lib/solana/jupiter'
import { jupiterExecuteBody } from '@/lib/validation'
import { VALIDATION } from '@/lib/api/constants'

export async function POST(req: Request) {
  return handleApi(async () => {
    const json = await readJsonBody(req)
    const parsed = jupiterExecuteBody.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: VALIDATION, issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const result = await executeSwap(parsed.data.signedTransaction, parsed.data.requestId)

    return NextResponse.json({
      status: result.status,
      signature: result.signature,
      inputAmountResult: result.inputAmountResult,
      outputAmountResult: result.outputAmountResult,
    })
  })
}
