import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js'
import { getMint } from '@solana/spl-token'
import { Decimal } from '@/lib/generated/prisma/internal/prismaNamespace'

import { ApiError } from '@/lib/api/errors'
import { RELAYER_NOT_CONFIGURED } from '@/lib/api/constants'
import { apiLogger } from '@/lib/api/logger'
import { createSubscriber, getSubscriptionPlanById } from '@/lib/services/subscription.service'
import { sendSubscriptionConfirmationEmail } from '@/lib/services/subscription-renewal.service'
import { createServerConnection } from '@/lib/solana/connection'
import { RPC_COMMITMENT } from '@/lib/solana/constants'
import { humanToRawAmount } from '@/lib/solana/amount'
import { buildRenewalTx } from '@/lib/solana/subscriptionTxBuilder'
import { getSubscriptionRelayerKeypair } from '@/lib/env/server'

export interface SubscriptionCheckoutInput {
  planId: string
  subscriberWallet: string
  signedTransaction: string
  executionId: string
  subscriberName?: string | null
  subscriberEmail?: string | null
}

export type SubscriptionCheckoutResult =
  | { failed: true; signature: string; error: string }
  | { failed: false; id: string; status: string; currentPeriodEnd: string; txSignature: string }

export async function processSubscriptionCheckout(
  input: SubscriptionCheckoutInput,
): Promise<SubscriptionCheckoutResult> {
  const { planId, subscriberWallet, signedTransaction, executionId, subscriberName, subscriberEmail } = input

  const plan = await getSubscriptionPlanById(planId)
  if (!plan || !plan.active) throw new ApiError(404, 'Subscription plan not found', 'PLAN_NOT_FOUND')

  const connection: Connection = createServerConnection()
  const txBytes = Buffer.from(signedTransaction, 'base64')
  const tx = VersionedTransaction.deserialize(txBytes)

  // Verify the transaction was signed by the claimed subscriber, not an impersonator.
  const feePayer = tx.message.staticAccountKeys[0].toBase58()
  if (feePayer !== subscriberWallet) {
    throw new ApiError(400, 'Transaction signer does not match subscriberWallet', 'SIGNER_MISMATCH')
  }

  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  })

  const { value } = await connection.confirmTransaction(
    { signature, ...(await connection.getLatestBlockhash(RPC_COMMITMENT)) },
    RPC_COMMITMENT,
  )

  if (value?.err) {
    return { failed: true, signature, error: JSON.stringify(value.err) }
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
    return { failed: true, signature: firstPaymentSig, error: JSON.stringify(firstPaymentResult.err) }
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

  return {
    failed: false,
    id: subscriber.id,
    status: subscriber.status,
    currentPeriodEnd: subscriber.currentPeriodEnd.toISOString(),
    txSignature: signature,
  }
}
