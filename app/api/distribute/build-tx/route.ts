import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'

import { handleApi, readJsonBody, ApiError } from '@/lib/api/errors'
import { requireSession } from '@/lib/auth/require-auth'
import { VALIDATION } from '@/lib/api/constants'
import { createServerConnection } from '@/lib/solana/connection'
import { getDefaultUsdcMint } from '@/lib/solana/constants'
import { getSolanaCluster } from '@/lib/env/server'

const USDC_DECIMALS = 6

const buildTxBody = z.object({
  partners: z
    .array(
      z.object({
        wallet: z.string().min(32).max(64),
        owedRaw: z.string().regex(/^\d+$/, 'owedRaw must be a non-negative integer string'),
      }),
    )
    .min(1)
    .max(9),
})

/**
 * POST /api/distribute/build-tx
 *
 * Builds an unsigned VersionedTransaction that:
 *  1. Creates each partner's USDC ATA if it doesn't exist (idempotent).
 *  2. Transfers the owed USDC amount from the merchant's ATA to each partner.
 *
 * The client deserializes the transaction, signs it with the merchant's wallet,
 * sends it on-chain, then calls POST /api/distribute to mark executions as done.
 */
export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const { wallet: merchantWallet } = await requireSession(req)

    const json = await readJsonBody(req)
    const parsed = buildTxBody.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: VALIDATION, issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const cluster = getSolanaCluster()
    const usdcMint = new PublicKey(getDefaultUsdcMint(cluster))
    const merchantPk = new PublicKey(merchantWallet)
    const merchantATA = getAssociatedTokenAddressSync(usdcMint, merchantPk, false, TOKEN_PROGRAM_ID)

    const connection = createServerConnection()

    const instructions = []

    for (const partner of parsed.data.partners) {
      const owedRaw = BigInt(partner.owedRaw)
      if (owedRaw === BigInt(0)) continue

      let partnerPk: PublicKey
      try {
        partnerPk = new PublicKey(partner.wallet)
      } catch {
        throw new ApiError(400, `Invalid partner wallet: ${partner.wallet}`, 'INVALID_PARTNER_WALLET')
      }

      const partnerATA = getAssociatedTokenAddressSync(usdcMint, partnerPk, false, TOKEN_PROGRAM_ID)

      // Create partner ATA if it doesn't exist — no-op if it already does
      instructions.push(
        createAssociatedTokenAccountIdempotentInstruction(
          merchantPk, // payer (merchant pays ATA rent if needed)
          partnerATA,
          partnerPk,
          usdcMint,
          TOKEN_PROGRAM_ID,
        ),
      )

      // Transfer owed amount from merchant ATA → partner ATA
      instructions.push(
        createTransferCheckedInstruction(
          merchantATA,
          usdcMint,
          partnerATA,
          merchantPk,
          owedRaw,
          USDC_DECIMALS,
          [],
          TOKEN_PROGRAM_ID,
        ),
      )
    }

    if (instructions.length === 0) {
      throw new ApiError(400, 'No partners with a non-zero owed amount', 'NOTHING_TO_DISTRIBUTE')
    }

    // Build a v0 transaction with a fresh blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()

    const message = new TransactionMessage({
      payerKey: merchantPk,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message()

    const tx = new VersionedTransaction(message)

    return NextResponse.json({
      /** Base64-encoded unsigned VersionedTransaction — deserialize with VersionedTransaction.deserialize */
      transaction: Buffer.from(tx.serialize()).toString('base64'),
      lastValidBlockHeight,
    })
  })
}
