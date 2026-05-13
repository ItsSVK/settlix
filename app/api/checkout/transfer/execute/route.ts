import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

import { VALIDATION } from '@/lib/api/constants'
import { handleApi, readJsonBody } from '@/lib/api/errors'
import { apiLogger } from '@/lib/api/logger'
import { prisma } from '@/lib/db'
import { executeSwap } from '@/lib/solana/jupiter'
import { directPayExecuteBody } from '@/lib/validation'

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

    const { signedTransaction, requestId, receiverWallet, userWallet, inputMint } = parsed.data

    const result = await executeSwap(signedTransaction, requestId)

    // Record for dashboard if the receiver is a known merchant.
    if (result.status === 'Success' && receiverWallet && userWallet && inputMint) {
      const merchant = await prisma.merchant.findUnique({
        where: { wallet: receiverWallet },
        select: { id: true },
      })
      if (merchant) {
        const inAmt = result.inputAmountResult ? BigInt(result.inputAmountResult) : BigInt(0)
        const outAmt = result.outputAmountResult ? BigInt(result.outputAmountResult) : BigInt(0)
        await prisma.paymentExecution
          .create({
            data: {
              clientExecutionId: randomUUID(),
              source: 'direct_transfer',
              merchantId: merchant.id,
              userWallet,
              inputToken: inputMint,
              inputAmount: inAmt,
              outputAmount: outAmt,
              txSignature: result.signature,
              status: 'paid',
              metadata: { label: 'Direct Send' },
            },
          })
          .catch((err: unknown) => {
            // Non-fatal: swap is confirmed on-chain; don't fail the response if DB write fails.
            apiLogger.error('Failed to record direct transfer execution', { err, signature: result.signature })
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
