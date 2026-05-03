import { type NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js'
import { getMint } from '@solana/spl-token'

import { ApiError, handleApi, readJsonBody } from '@/lib/api/errors'
import { NOT_A_SUBSCRIPTION, RELAYER_NOT_CONFIGURED, VALIDATION } from '@/lib/api/constants'
import { apiLogger } from '@/lib/api/logger'
import { processSubmitTx } from '@/lib/services/payment-submit.service'
import { createSubscription, getSubscriptionsByMerchant } from '@/lib/services/subscription.service'
import { getPaymentLinkById } from '@/lib/services/payment-link.service'
import { createServerConnection } from '@/lib/solana/connection'
import { RPC_COMMITMENT } from '@/lib/solana/constants'
import { humanToRawAmount } from '@/lib/solana/amount'
import { buildRenewalTx } from '@/lib/solana/subscriptionTxBuilder'
import { getSubscriptionRelayerKeypair } from '@/lib/env/server'
import { createSubscriptionBody } from '@/lib/validation'
import { requireAuth } from '@/lib/auth/require-auth'
import { Decimal } from '@/lib/generated/prisma/internal/prismaNamespace'

/**
 * POST /api/subscriptions
 *
 * Submits the signed subscription authorization transaction, verifies the
 * first-period payment on-chain, and creates the Subscription record.
 *
 * Body: { linkId, subscriberWallet, signedTransaction, executionId }
 */
export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const json = await readJsonBody(req)
    const parsed = createSubscriptionBody.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: VALIDATION, issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const { linkId, subscriberWallet, signedTransaction, executionId } = parsed.data

    const link = await getPaymentLinkById(linkId)
    if (!link || !link.active) throw new ApiError(404, 'Payment link not found', 'LINK_NOT_FOUND')
    if (link.type !== 'subscription' || !link.interval) {
      throw new ApiError(400, 'This link is not a subscription', NOT_A_SUBSCRIPTION)
    }

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
      return NextResponse.json(
        { status: 'Failed', signature, error: JSON.stringify(value.err) },
        { status: 200 },
      )
    }

    // Auth tx confirmed — now pull the first payment using the relayer as delegate
    let relayerKeypair
    try {
      relayerKeypair = getSubscriptionRelayerKeypair()
    } catch {
      throw new ApiError(503, 'Subscription relayer is not configured', RELAYER_NOT_CONFIGURED)
    }

    const mintPk = new PublicKey(link.token)
    const mintInfo = await getMint(connection, mintPk, RPC_COMMITMENT)
    const transferAmountRaw = humanToRawAmount(new Decimal(link.amount.toString()), mintInfo.decimals)

    const firstPaymentTx = await buildRenewalTx({
      connection,
      subscriber: new PublicKey(subscriberWallet),
      merchant: new PublicKey(link.merchantWallet),
      relayerKeypair,
      settlementMint: mintPk,
      transferAmountRaw,
      mintDecimals: mintInfo.decimals,
      subscriptionId: 'first',
    })

    const firstPaymentSig = await connection.sendRawTransaction(firstPaymentTx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    })

    const { value: firstPaymentResult } = await connection.confirmTransaction(
      { signature: firstPaymentSig, ...(await connection.getLatestBlockhash(RPC_COMMITMENT)) },
      RPC_COMMITMENT,
    )

    if (firstPaymentResult?.err) {
      apiLogger.warn('Subscription first payment failed on-chain', {
        authSignature: signature,
        firstPaymentSig,
        error: JSON.stringify(firstPaymentResult.err),
      })
    }

    const recordResult = await processSubmitTx({
      executionId,
      txSignature: firstPaymentSig,
      linkId,
      userWallet: subscriberWallet,
      inputToken: link.token,
    })
    if (!recordResult.ok) {
      apiLogger.warn('Subscription first payment confirmed but record failed', {
        txSignature: firstPaymentSig,
        reason: recordResult.reason,
      })
    }

    const subscription = await createSubscription({
      linkId,
      subscriberWallet,
      interval: link.interval,
      txSignature: firstPaymentSig,
    })

    return NextResponse.json(
      {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
        txSignature: signature,
      },
      { status: 201 },
    )
  })
}

/**
 * GET /api/subscriptions
 *
 * Returns subscriptions for the authenticated merchant's links (dashboard view).
 */
export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const { wallet } = await requireAuth(req)
    const subscriptions = await getSubscriptionsByMerchant(wallet)

    return NextResponse.json({
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        linkId: s.linkId,
        subscriberWallet: s.subscriberWallet,
        status: s.status,
        currentPeriodEnd: s.currentPeriodEnd.toISOString(),
        cancelledAt: s.cancelledAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
        plan: {
          title: s.link.title ?? null,
          amount: s.link.amount.toString(),
          token: s.link.token,
          interval: s.link.interval ?? null,
        },
        lastRenewal: s.renewals[0]
          ? {
              status: s.renewals[0].status,
              txSignature: s.renewals[0].txSignature ?? null,
              executedAt: s.renewals[0].executedAt?.toISOString() ?? null,
            }
          : null,
      })),
    })
  })
}
