import { PublicKey } from '@solana/web3.js'
import { NextResponse } from 'next/server'

import { ApiError, handleApi, readJsonBody } from '@/lib/api/errors'
import { getSolanaCluster } from '@/lib/env/server'
import { decimalFromCreateLinkAmount } from '@/lib/money'
import { isAllowedSettlementMint } from '@/lib/solana/constants'
import { insertPaymentLink } from '@/lib/services/payment-link.service'
import { createLinkBody } from '@/lib/validation'
import { INVALID_AMOUNT, INVALID_WALLET, UNSUPPORTED_SETTLEMENT_TOKEN, VALIDATION } from '@/lib/api/constants'

export async function POST(req: Request) {
  return handleApi(async () => {
    const json = await readJsonBody(req)
    const parsed = createLinkBody.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: VALIDATION, issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const cluster = getSolanaCluster()

    let merchantPk: PublicKey
    try {
      merchantPk = new PublicKey(parsed.data.merchantWallet)
    } catch {
      throw new ApiError(400, 'Invalid merchant wallet', INVALID_WALLET)
    }

    if (!isAllowedSettlementMint(parsed.data.token, cluster)) {
      throw new ApiError(400, 'Unsupported settlement token for this network', UNSUPPORTED_SETTLEMENT_TOKEN)
    }

    const amount = decimalFromCreateLinkAmount(parsed.data.amount)
    if (!amount.gt(0)) {
      throw new ApiError(400, 'Amount must be positive', INVALID_AMOUNT)
    }

    const link = await insertPaymentLink({
      merchantWallet: merchantPk.toBase58(),
      token: parsed.data.token,
      amount,
    })

    return NextResponse.json({
      id: link.id,
      payPath: `/pay/${link.id}`,
    })
  })
}
