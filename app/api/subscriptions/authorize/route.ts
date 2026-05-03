import { type NextRequest, NextResponse } from 'next/server'
import { PublicKey } from '@solana/web3.js'
import { getMint } from '@solana/spl-token'

import { ApiError, handleApi, readJsonBody } from '@/lib/api/errors'
import { NOT_A_SUBSCRIPTION, RELAYER_NOT_CONFIGURED, VALIDATION } from '@/lib/api/constants'
import { getSubscriptionRelayerKeypair } from '@/lib/env/server'
import { humanToRawAmount } from '@/lib/solana/amount'
import { createServerConnection } from '@/lib/solana/connection'
import { RPC_COMMITMENT } from '@/lib/solana/constants'
import { buildSubscriptionAuthorizationTx } from '@/lib/solana/subscriptionTxBuilder'
import { getPaymentLinkById } from '@/lib/services/payment-link.service'
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

    const { linkId, subscriberWallet } = parsed.data

    const link = await getPaymentLinkById(linkId)
    if (!link || !link.active) throw new ApiError(404, 'Payment link not found', 'LINK_NOT_FOUND')
    if (link.type !== 'subscription' || !link.interval) {
      throw new ApiError(400, 'This link is not a subscription', NOT_A_SUBSCRIPTION)
    }

    let relayerKeypair
    try {
      relayerKeypair = getSubscriptionRelayerKeypair()
    } catch (e) {
      console.error(e)
      throw new ApiError(503, 'Subscription relayer is not configured', RELAYER_NOT_CONFIGURED)
    }

    const connection = createServerConnection()
    const mintPk = new PublicKey(link.token)
    const mintInfo = await getMint(connection, mintPk, RPC_COMMITMENT)
    const transferAmountRaw = humanToRawAmount(new Decimal(link.amount.toString()), mintInfo.decimals)

    const tx = await buildSubscriptionAuthorizationTx({
      connection,
      subscriber: new PublicKey(subscriberWallet),
      relayer: relayerKeypair.publicKey,
      settlementMint: mintPk,
      transferAmountRaw,
      mintDecimals: mintInfo.decimals,
      linkId,
    })

    return NextResponse.json({
      transaction: Buffer.from(tx.serialize()).toString('base64'),
      amount: link.amount.toString(),
      interval: link.interval,
      delegationMonths: 12,
    })
  })
}
