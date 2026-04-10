import { PublicKey } from '@solana/web3.js'
import { type NextRequest, NextResponse } from 'next/server'

import { ApiError, handleApi, readJsonBody } from '@/lib/api/errors'
import { getSolanaCluster } from '@/lib/env/server'
import { decimalFromCreateLinkAmount } from '@/lib/money'
import { isAllowedSettlementMint } from '@/lib/solana/constants'
import { insertPaymentLink } from '@/lib/services/payment-link.service'
import { createLinkBody } from '@/lib/validation'
import { INVALID_AMOUNT, UNSUPPORTED_SETTLEMENT_TOKEN, VALIDATION } from '@/lib/api/constants'
import { requireAuth } from '@/lib/auth/require-auth'

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    // Merchant must be authenticated — wallet comes from the JWT session
    const { wallet: merchantWallet } = await requireAuth(req)

    const json = await readJsonBody(req)
    const parsed = createLinkBody.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: VALIDATION, issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const cluster = getSolanaCluster()

    // Validate that the session wallet is a valid public key (belt-and-suspenders)
    try {
      new PublicKey(merchantWallet)
    } catch {
      throw new ApiError(400, 'Session wallet is not a valid public key', 'INVALID_WALLET')
    }

    if (!isAllowedSettlementMint(parsed.data.token, cluster)) {
      throw new ApiError(400, 'Unsupported settlement token for this network', UNSUPPORTED_SETTLEMENT_TOKEN)
    }

    const amount = decimalFromCreateLinkAmount(parsed.data.amount)
    if (!amount.gt(0)) {
      throw new ApiError(400, 'Amount must be positive', INVALID_AMOUNT)
    }

    const link = await insertPaymentLink({
      merchantWallet,
      token: parsed.data.token,
      amount,
    })

    return NextResponse.json({
      id: link.id,
      payPath: `/pay/${link.id}`,
    })
  })
}
