import { NextResponse } from 'next/server'
import { Connection, VersionedTransaction } from '@solana/web3.js'
import { VALIDATION } from '@/lib/api/constants'
import { handleApi, readJsonBody } from '@/lib/api/errors'
import { apiLogger } from '@/lib/api/logger'
import { processSubmitTx } from '@/lib/services/payment-submit.service'
import { createServerConnection } from '@/lib/solana/connection'
import { RPC_COMMITMENT } from '@/lib/solana/constants'
import { sendTxBody } from '@/lib/validation'

/**
 * POST /api/solana/send
 *
 * Submits a signed VersionedTransaction directly to the Solana RPC.
 * Used for same-mint payments where no Jupiter swap is involved.
 *
 * Body: { signedTransaction, executionId, linkId, userWallet, inputToken, inAmount }
 * Returns: { status: 'Success' | 'Failed', signature: string }
 */
export async function POST(req: Request) {
  return handleApi(async () => {
    const json = await readJsonBody(req)
    const parsed = sendTxBody.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: VALIDATION, issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const connection: Connection = createServerConnection()
    const txBytes = Buffer.from(parsed.data.signedTransaction, 'base64')
    const tx = VersionedTransaction.deserialize(txBytes)

    const signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    })

    // Wait for confirmation
    const { value } = await connection.confirmTransaction(
      { signature, ...(await connection.getLatestBlockhash(RPC_COMMITMENT)) },
      RPC_COMMITMENT,
    )

    if (value?.err) {
      return NextResponse.json(
        { status: 'Failed', signature, error: JSON.stringify(value.err) },
        { status: 200 }, // 200 so frontend can read the body
      )
    }

    // Record the payment server-side immediately after confirmation.
    // Direct transfers use inAmount for both input and output (same-mint).
    const recordResult = await processSubmitTx({
      executionId: parsed.data.executionId,
      txSignature: signature,
      linkId: parsed.data.linkId,
      userWallet: parsed.data.userWallet,
      inputToken: parsed.data.inputToken,
      inputAmount: parsed.data.inAmount,
      outputAmount: parsed.data.inAmount,
    })
    if (!recordResult.ok) {
      apiLogger.warn('Direct transfer confirmed but DB record failed', {
        txSignature: signature,
        reason: recordResult.reason,
      })
    }

    return NextResponse.json({ status: 'Success', signature })
  })
}
