import { NextResponse } from 'next/server'

import { VALIDATION } from '@/lib/api/constants'
import { handleApi, readJsonBody } from '@/lib/api/errors'
import { apiLogger } from '@/lib/api/logger'
import { processSubmitTx } from '@/lib/services/payment-submit.service'
import { executeSwap } from '@/lib/solana/jupiter'
import { jupiterExecuteBody } from '@/lib/validation'

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

    // Record the payment server-side immediately after Jupiter confirms the swap.
    // This eliminates the browser-to-/api/submit-tx race condition where a dropped
    // tab/network could leave a confirmed on-chain tx unrecorded.
    if (result.status === 'Success') {
      const recordResult = await processSubmitTx({
        executionId: parsed.data.executionId,
        source: parsed.data.source,
        txSignature: result.signature,
        linkId: parsed.data.linkId,
        invoiceId: parsed.data.invoiceId,
        userWallet: parsed.data.userWallet,
        inputToken: parsed.data.inputToken,
        inputAmount: result.inputAmountResult,
        outputAmount: result.outputAmountResult,
      })
      if (!recordResult.ok) {
        apiLogger.warn('Payment recorded on-chain but DB record failed', {
          txSignature: result.signature,
          reason: recordResult.reason,
        })
      }
    }

    return NextResponse.json({
      status: result.status,
      signature: result.signature,
      inputAmountResult: result.inputAmountResult,
      outputAmountResult: result.outputAmountResult,
    })
  })
}
