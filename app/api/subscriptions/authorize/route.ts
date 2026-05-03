import { type NextRequest, NextResponse } from 'next/server'
import { PublicKey } from '@solana/web3.js'
import { getMint } from '@solana/spl-token'

import { ApiError, handleApi, readJsonBody } from '@/lib/api/errors'
import { RELAYER_NOT_CONFIGURED, VALIDATION } from '@/lib/api/constants'
import { getSubscriptionRelayerKeypair } from '@/lib/env/server'
import { humanToRawAmount } from '@/lib/solana/amount'
import { createServerConnection } from '@/lib/solana/connection'
import { RPC_COMMITMENT } from '@/lib/solana/constants'
import { buildSubscriptionAuthorizationTx } from '@/lib/solana/subscriptionTxBuilder'
import { getSubscriptionPlanById } from '@/lib/services/subscription.service'
import { authorizeSubscriptionBody } from '@/lib/validation'
import { Decimal } from '@/lib/generated/prisma/internal/prismaNamespace'

/**
 * POST /api/subscriptions/authorize
 *
 * Builds and returns the unsigned subscription authorization transaction.
 * The transaction contains: approve(relayer) + first-period transferChecked.
 * Client signs and submits to POST /api/subscriptions.
 */
export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const json = await readJsonBody(req)
    const parsed = authorizeSubscriptionBody.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: VALIDATION, issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const { planId, subscriberWallet } = parsed.data

    const plan = await getSubscriptionPlanById(planId)
    if (!plan || !plan.active) throw new ApiError(404, 'Subscription plan not found', 'PLAN_NOT_FOUND')

    let relayerKeypair
    try {
      relayerKeypair = getSubscriptionRelayerKeypair()
    } catch (e) {
      console.error(e)
      throw new ApiError(503, 'Subscription relayer is not configured', RELAYER_NOT_CONFIGURED)
    }

    const connection = createServerConnection()
    const mintPk = new PublicKey(plan.token)
    const mintInfo = await getMint(connection, mintPk, RPC_COMMITMENT)
    const transferAmountRaw = humanToRawAmount(new Decimal(plan.amount.toString()), mintInfo.decimals)

    const tx = await buildSubscriptionAuthorizationTx({
      connection,
      subscriber: new PublicKey(subscriberWallet),
      relayer: relayerKeypair.publicKey,
      settlementMint: mintPk,
      transferAmountRaw,
      mintDecimals: mintInfo.decimals,
      planId,
    })

    return NextResponse.json({
      transaction: Buffer.from(tx.serialize()).toString('base64'),
      amount: plan.amount.toString(),
      interval: plan.interval,
      delegationMonths: 12,
    })
  })
}
