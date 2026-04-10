import { NextResponse } from 'next/server'

import { handleApi, readJsonBody } from '@/lib/api/errors'
import { executeJupiterOrderRequest } from '@/lib/services/jupiter-order.service'
import { jupiterOrderBody } from '@/lib/validation'
import { VALIDATION } from '@/lib/api/constants'

export async function POST(req: Request) {
  return handleApi(async () => {
    const json = await readJsonBody(req)
    const parsed = jupiterOrderBody.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: VALIDATION, issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const order = await executeJupiterOrderRequest(parsed.data)

    return NextResponse.json({
      transaction: order.transaction,
      inAmount: order.inAmount,
      outAmount: order.outAmount,
      inputMint: order.inputMint,
      outputMint: order.outputMint,
      requestId: order.requestId,
    })
  })
}
