import { NextResponse } from 'next/server'
import { Connection, VersionedTransaction } from '@solana/web3.js'
import { randomUUID } from 'crypto'

import { VALIDATION } from '@/lib/api/constants'
import { handleApi, readJsonBody } from '@/lib/api/errors'
import { apiLogger } from '@/lib/api/logger'
import { prisma } from '@/lib/db'
import { createServerConnection } from '@/lib/solana/connection'
import { RPC_COMMITMENT } from '@/lib/solana/constants'
import { directPaySendBody } from '@/lib/validation'

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

    const { signedTransaction, receiverWallet, userWallet, inputMint, inputAmount, outputAmount } = parsed.data

    const connection: Connection = createServerConnection()
    const txBytes = Buffer.from(signedTransaction, 'base64')
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

    // Record for dashboard — always resolve merchant via the on-chain receiverWallet,
    // never via a client-supplied ID (prevents dashboard poisoning).
    if (userWallet && inputMint && inputAmount && outputAmount && receiverWallet) {
      const merchant = await prisma.merchant.findUnique({
        where: { wallet: receiverWallet },
        select: { id: true },
      })

      if (merchant) {
        await prisma.paymentExecution
          .create({
            data: {
              clientExecutionId: randomUUID(),
              source: 'direct_transfer',
              merchantId: merchant.id,
              userWallet,
              inputToken: inputMint,
              inputAmount: BigInt(inputAmount),
              outputAmount: BigInt(outputAmount),
              txSignature: signature,
              status: 'paid',
              metadata: { label: 'Direct Transfer' },
            },
          })
          .catch((err: unknown) => {
            // Non-fatal: tx is confirmed on-chain; don't fail the response if DB write fails.
            apiLogger.error('Failed to record direct transfer execution', { err, signature })
          })
      }
    }

    return NextResponse.json({ status: 'Success', signature })
  })
}
