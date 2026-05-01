import { NextResponse } from 'next/server'

import { VALIDATION } from '@/lib/api/constants'
import { handleApi, readJsonBody } from '@/lib/api/errors'
import { executeSwap } from '@/lib/solana/jupiter'
import { directPayExecuteBody } from '@/lib/validation'

/**
 * POST /api/checkout/transfer/execute
 *
 * Executes a Jupiter swap for the direct-pay (pay any address) flow.
 * No payment link, no DB recording — the on-chain tx is the full record.
 */
export async function POST(req: Request) {
  return handleApi(async () => {
    const json = await readJsonBody(req)
    const parsed = directPayExecuteBody.safeParse(json)
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
