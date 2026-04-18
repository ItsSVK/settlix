import { NextResponse } from 'next/server'
import { Connection, VersionedTransaction } from '@solana/web3.js'

import { VALIDATION } from '@/lib/api/constants'
import { handleApi, readJsonBody } from '@/lib/api/errors'
import { createServerConnection } from '@/lib/solana/connection'
import { RPC_COMMITMENT } from '@/lib/solana/constants'
import { directPaySendBody } from '@/lib/validation'

/**
 * POST /api/direct-pay/send
 *
 * Submits a signed direct USDC transfer for the pay-any-address flow.
 * No DB recording — on-chain tx is the full record.
 */
export async function POST(req: Request) {
  return handleApi(async () => {
    const json = await readJsonBody(req)
    const parsed = directPaySendBody.safeParse(json)
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

    const { value } = await connection.confirmTransaction(
      { signature, ...(await connection.getLatestBlockhash(RPC_COMMITMENT)) },
      RPC_COMMITMENT,
    )

    if (value?.err) {
      return NextResponse.json({ status: 'Failed', signature, error: JSON.stringify(value.err) }, { status: 200 })
    }

    return NextResponse.json({ status: 'Success', signature })
  })
}
