import { NextResponse } from 'next/server'
import { Connection, VersionedTransaction } from '@solana/web3.js'
import { handleApi, readJsonBody } from '@/lib/api/errors'
import { createServerConnection } from '@/lib/solana/connection'
import { RPC_COMMITMENT } from '@/lib/solana/constants'

/**
 * POST /api/solana/send
 *
 * Submits a signed VersionedTransaction directly to the Solana RPC.
 * Used for same-mint payments where no Jupiter swap is involved.
 *
 * Body: { signedTransaction: string } — base64-encoded signed tx
 * Returns: { status: 'Success' | 'Failed', signature: string }
 */
export async function POST(req: Request) {
  return handleApi(async () => {
    const body = (await readJsonBody(req)) as Record<string, unknown>
    const signedTransaction = body.signedTransaction
    if (!signedTransaction || typeof signedTransaction !== 'string') {
      return NextResponse.json({ error: 'signedTransaction is required' }, { status: 400 })
    }

    const connection: Connection = createServerConnection()
    const txBytes = Buffer.from(signedTransaction, 'base64')
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

    return NextResponse.json({ status: 'Success', signature })
  })
}
