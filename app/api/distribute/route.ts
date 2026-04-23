import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { handleApi, readJsonBody } from '@/lib/api/errors'
import { requireAuth } from '@/lib/auth/require-auth'
import { VALIDATION } from '@/lib/api/constants'
import { getPendingDistributions, markAsDistributed } from '@/lib/services/distribute.service'
import { createServerConnection } from '@/lib/solana/connection'
import { RPC_COMMITMENT } from '@/lib/solana/constants'

/** GET /api/distribute — returns pending partner amounts for the authenticated merchant */
export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const { wallet } = await requireAuth(req)
    const pending = await getPendingDistributions(wallet)
    return NextResponse.json(pending)
  })
}

const confirmBody = z.object({
  /** The on-chain tx signature of the distribution transaction */
  txSignature: z.string().min(80).max(128),
  /** Execution IDs that were distributed in this tx */
  executionIds: z.array(z.string().cuid()).min(1).max(500),
})

/**
 * POST /api/distribute — merchant calls this after the distribution tx confirms.
 * Verifies the tx landed on-chain then marks executions as distributed.
 */
export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const { wallet } = await requireAuth(req)

    const json = await readJsonBody(req)
    const parsed = confirmBody.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', code: VALIDATION, issues: parsed.error.issues }, { status: 400 })
    }

    // Verify the distribution tx actually landed on-chain
    const connection = createServerConnection()
    const tx = await connection.getSignatureStatus(parsed.data.txSignature, { searchTransactionHistory: true })
    if (!tx?.value || tx.value.err) {
      return NextResponse.json({ error: 'Transaction not confirmed on-chain', code: 'TX_NOT_CONFIRMED' }, { status: 400 })
    }

    const updated = await markAsDistributed(parsed.data.executionIds, wallet)

    return NextResponse.json({ distributed: updated })
  })
}
