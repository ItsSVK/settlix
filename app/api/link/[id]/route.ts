import { PublicKey } from '@solana/web3.js'
import { NextResponse } from 'next/server'

import { ApiError, handleApi, readJsonBody } from '@/lib/api/errors'
import { getPaymentLinkById, updatePaymentLinkActive } from '@/lib/services/payment-link.service'
import { INVALID_WALLET, NOT_FOUND, VALIDATION } from '@/lib/api/constants'
import { updateLinkActiveBody } from '@/lib/validation'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params
    const link = await getPaymentLinkById(id)

    if (!link || !link.active) {
      return NextResponse.json({ error: 'Not found', code: NOT_FOUND }, { status: 404 })
    }

    return NextResponse.json({
      id: link.id,
      merchantWallet: link.merchantWallet,
      token: link.token,
      amount: link.amount.toString(),
      type: link.type,
      createdAt: link.createdAt.toISOString(),
    })
  })
}

export async function PATCH(req: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params
    const json = await readJsonBody(req)
    const parsed = updateLinkActiveBody.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: VALIDATION, issues: parsed.error.issues },
        { status: 400 },
      )
    }

    let merchantPk: PublicKey
    try {
      merchantPk = new PublicKey(parsed.data.merchantWallet)
    } catch {
      throw new ApiError(400, 'Invalid merchant wallet', INVALID_WALLET)
    }

    const updated = await updatePaymentLinkActive(id, merchantPk.toBase58(), parsed.data.active)

    return NextResponse.json({
      id: updated.id,
      active: updated.active,
    })
  })
}
