import { type NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js'
import { getMint } from '@solana/spl-token'

import { ApiError, handleApi, readJsonBody } from '@/lib/api/errors'
import { RELAYER_NOT_CONFIGURED, VALIDATION } from '@/lib/api/constants'
import { apiLogger } from '@/lib/api/logger'
import { createSubscriber, getSubscribersByMerchant, getSubscriptionPlanById } from '@/lib/services/subscription.service'
import { sendSubscriptionConfirmationEmail } from '@/lib/services/subscription-renewal.service'
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
 * first-period payment on-chain, and creates the Subscriber record.
 *
 * Body: { planId, subscriberWallet, signedTransaction, executionId }
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

    const { planId, subscriberWallet, signedTransaction, executionId, subscriberName, subscriberEmail } = parsed.data

    const plan = await getSubscriptionPlanById(planId)
    if (!plan || !plan.active) throw new ApiError(404, 'Subscription plan not found', 'PLAN_NOT_FOUND')

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

    let relayerKeypair
    try {
      relayerKeypair = getSubscriptionRelayerKeypair()
    } catch {
      throw new ApiError(503, 'Subscription relayer is not configured', RELAYER_NOT_CONFIGURED)
    }

    const mintPk = new PublicKey(plan.token)
    const mintInfo = await getMint(connection, mintPk, RPC_COMMITMENT)
    const transferAmountRaw = humanToRawAmount(new Decimal(plan.amount.toString()), mintInfo.decimals)

    const firstPaymentTx = await buildRenewalTx({
      connection,
      subscriber: new PublicKey(subscriberWallet),
      merchant: new PublicKey(plan.merchant.wallet),
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

    const subscriber = await createSubscriber({
      planId,
      subscriberWallet,
      subscriberName: subscriberName ?? undefined,
      subscriberEmail: subscriberEmail ?? undefined,
      firstPayment: {
        executionId,
        txSignature: firstPaymentSig,
        inputToken: plan.token,
        inputAmount: transferAmountRaw,
        outputAmount: transferAmountRaw,
      },
    })

    void sendSubscriptionConfirmationEmail({
      subscriberEmail: subscriberEmail ?? null,
      subscriberName: subscriberName ?? null,
      planTitle: plan.title,
      planId,
      subscriberId: subscriber.id,
      amount: plan.amount.toString(),
      token: plan.token,
      interval: plan.interval,
      nextBillingDate: subscriber.currentPeriodEnd.toISOString(),
      txSignature: firstPaymentSig,
    })

    return NextResponse.json(
      {
        id: subscriber.id,
        status: subscriber.status,
        currentPeriodEnd: subscriber.currentPeriodEnd.toISOString(),
        txSignature: signature,
      },
      { status: 201 },
    )
  })
}

/**
 * GET /api/subscriptions
 *
 * Returns subscribers for the authenticated merchant's plans (dashboard view).
 */
export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const { wallet } = await requireAuth(req)
    const subscribers = await getSubscribersByMerchant(wallet)

    return NextResponse.json({
      subscriptions: subscribers.map((s) => ({
        id: s.id,
        planId: s.planId,
        subscriberWallet: s.subscriberWallet,
        status: s.status,
        currentPeriodEnd: s.currentPeriodEnd.toISOString(),
        cancelledAt: s.cancelledAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
        plan: {
          title: s.plan.title ?? null,
          amount: s.plan.amount.toString(),
          token: s.plan.token,
          interval: s.plan.interval,
        },
        lastRenewal: s.renewals[0]
          ? {
              status: s.renewals[0].status,
              txSignature: s.renewals[0].execution?.txSignature ?? null,
              executedAt: s.renewals[0].executedAt?.toISOString() ?? null,
            }
          : null,
        renewals: s.renewals.map((renewal) => ({
          id: renewal.id,
          status: renewal.status,
          dueAt: renewal.dueAt.toISOString(),
          executedAt: renewal.executedAt?.toISOString() ?? null,
          amount: renewal.amountSnapshot.toString(),
          token: renewal.tokenSnapshot,
          txSignature: renewal.execution?.txSignature ?? null,
          outputAmount: renewal.execution?.outputAmount?.toString() ?? null,
          executionStatus: renewal.execution?.status ?? null,
        })),
      })),
    })
  })
}
