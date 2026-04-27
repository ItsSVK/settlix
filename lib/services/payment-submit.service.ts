import { PaymentExecutionStatus, Prisma } from '@/lib/generated/prisma/client'
import { Decimal } from '@/lib/generated/prisma/internal/prismaNamespace'
import { getMint } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'

import { decompileVersionedTransactionMessage } from '@/lib/solana/address-lookup'

import {
  DB_UNEXPECTED,
  DB_UPSERT_FAILED,
  LINK_NOT_FOUND,
  LINK_SOLD_OUT,
  TX_NOT_FOUND,
  UNKNOWN_PAYER_WALLET,
  VERIFY_FAILED,
} from '@/lib/api/constants'
import { ApiError } from '@/lib/api/errors'
import { apiLogger } from '@/lib/api/logger'
import { prisma } from '@/lib/db'
import { decimalFromOptionalString } from '@/lib/money'
import { humanToRawAmount } from '@/lib/solana/amount'
import { createServerConnection } from '@/lib/solana/connection'
import { RPC_COMMITMENT } from '@/lib/solana/constants'
import { verifyPaymentTransaction } from '@/lib/solana/verify'
import type { SubmitTxBody } from '@/lib/validation'
import { publishDashboardPaymentPaid } from '@/lib/realtime/dashboard-stream'

import { getPaymentLinkById } from './payment-link.service'
import { deliverPaymentWebhook } from './payment-webhook.service'

export type SubmitTxOutcome = { ok: true } | { ok: false; reason: string; httpStatus: number; code: string }

export async function processSubmitTx(body: SubmitTxBody): Promise<SubmitTxOutcome> {
  const link = await getPaymentLinkById(body.linkId)
  if (!link || !link.active) {
    return { ok: false, reason: 'Link not found', httpStatus: 404, code: LINK_NOT_FOUND }
  }

  if (link.maxUses !== null && link._count.executions >= link.maxUses) {
    return { ok: false, reason: 'Payment limit reached', httpStatus: 409, code: LINK_SOLD_OUT }
  }

  const connection = createServerConnection()
  const mintPk = new PublicKey(link.token)
  const mintInfo = await getMint(connection, mintPk, RPC_COMMITMENT)
  const expectedRaw = humanToRawAmount(link.amount, mintInfo.decimals)

  // Single RPC fetch — passed directly into verifyPaymentTransaction so there
  // is no second round-trip for the same signature.
  const tx = await connection.getTransaction(body.txSignature, {
    commitment: RPC_COMMITMENT,
    maxSupportedTransactionVersion: 0,
  })

  if (!tx) {
    await upsertPaymentExecution({
      executionId: body.executionId,
      linkId: body.linkId,
      merchantWallet: link.merchantWallet,
      txSignature: body.txSignature,
      userWallet: body.userWallet ?? UNKNOWN_PAYER_WALLET,
      inputToken: body.inputToken ?? link.token,
      inputAmount: decimalFromOptionalString(body.inputAmount, new Decimal(0)),
      outputAmount: decimalFromOptionalString(body.outputAmount, new Decimal(0)),
      status: PaymentExecutionStatus.failed,
      settlementToken: link.token,
      metadata: body.metadata ?? null,
      webhookUrl: link.webhookUrl,
      webhookSecret: link.webhookSecret,
    })
    return {
      ok: false,
      reason: 'Transaction not found on RPC',
      httpStatus: 400,
      code: TX_NOT_FOUND,
    }
  }

  const decompiled = await decompileVersionedTransactionMessage(connection, tx.transaction.message)
  const userWallet = body.userWallet ?? decompiled.payerKey.toBase58()

  const verify = await verifyPaymentTransaction({
    connection,
    tx, // pre-fetched — no second getTransaction call inside verify
    merchantWallet: link.merchantWallet,
    settlementMint: link.token,
    expectedRaw,
  })

  const inputToken = body.inputToken ?? link.token
  const inputAmountDec = decimalFromOptionalString(body.inputAmount, new Decimal(0))
  const outputAmountDec = decimalFromOptionalString(body.outputAmount, link.amount)

  const status = verify.ok ? PaymentExecutionStatus.paid : PaymentExecutionStatus.failed

  const upsertResult = await upsertPaymentExecution({
    executionId: body.executionId,
    linkId: body.linkId,
    merchantWallet: link.merchantWallet,
    txSignature: body.txSignature,
    userWallet,
    inputToken,
    inputAmount: inputAmountDec,
    outputAmount: outputAmountDec,
    status,
    settlementToken: link.token,
    metadata: body.metadata ?? null,
    webhookUrl: link.webhookUrl,
    webhookSecret: link.webhookSecret,
  })

  // txSignature was already recorded (different executionId, same on-chain tx).
  // This is idempotent — treat as success so the UI can proceed normally.
  if (upsertResult === 'already_recorded') {
    return { ok: true }
  }

  if (!verify.ok) {
    return { ok: false, reason: verify.reason, httpStatus: 400, code: VERIFY_FAILED }
  }

  return { ok: true }
}

type UpsertResult = 'ok' | 'already_recorded'

async function upsertPaymentExecution(data: {
  executionId: string
  linkId: string
  merchantWallet: string
  txSignature: string
  userWallet: string
  inputToken: string
  inputAmount: Decimal
  outputAmount: Decimal
  status: PaymentExecutionStatus
  settlementToken: string
  metadata?: Record<string, unknown> | null
  webhookUrl?: string | null
  webhookSecret?: string | null
}): Promise<UpsertResult> {
  try {
    const existing = await prisma.paymentExecution.findUnique({
      where: { clientExecutionId: data.executionId },
      select: { status: true },
    })

    const saved = await prisma.paymentExecution.upsert({
      where: { clientExecutionId: data.executionId },
      create: {
        clientExecutionId: data.executionId,
        linkId: data.linkId,
        userWallet: data.userWallet,
        inputToken: data.inputToken,
        inputAmount: data.inputAmount,
        outputAmount: data.outputAmount,
        txSignature: data.txSignature,
        status: data.status,
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
      },
      update: {
        status: data.status,
        userWallet: data.userWallet,
        txSignature: data.txSignature,
        inputToken: data.inputToken,
        inputAmount: data.inputAmount,
        outputAmount: data.outputAmount,
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
      },
    })

    if (data.status === PaymentExecutionStatus.paid && existing?.status !== PaymentExecutionStatus.paid) {
      publishDashboardPaymentPaid({
        type: 'payment_paid',
        merchantWallet: data.merchantWallet,
        linkId: data.linkId,
        executionId: saved.id,
        txSignature: data.txSignature,
        outputAmount: data.outputAmount.toString(),
        settlementToken: data.settlementToken,
        createdAt: saved.createdAt.toISOString(),
      })

      if (data.webhookUrl) {
        void deliverPaymentWebhook({
          webhookUrl: data.webhookUrl,
          webhookSecret: data.webhookSecret,
          payload: {
            linkId: data.linkId,
            txSignature: data.txSignature,
            inputToken: data.inputToken,
            inputAmount: data.inputAmount.toString(),
            outputAmount: data.outputAmount.toString(),
            userWallet: data.userWallet,
            timestamp: saved.createdAt.toISOString(),
            metadata: data.metadata ?? null,
          },
        })
      }
    }

    return 'ok'
  } catch (e) {
    // P2002 = unique constraint violation. If it's on txSignature, another
    // execution record already exists for this on-chain tx (different clientExecutionId).
    // Treat as idempotent — the payment was recorded, no double-counting.
    if (
      e instanceof Error &&
      'code' in e &&
      (e as { code: string }).code === 'P2002' &&
      'meta' in e &&
      Array.isArray((e as { meta: { target?: unknown } }).meta?.target) &&
      ((e as { meta: { target: string[] } }).meta.target as string[]).includes('txSignature')
    ) {
      apiLogger.warn('txSignature already recorded — idempotent duplicate skipped', {
        txSignature: data.txSignature,
        executionId: data.executionId,
      })
      return 'already_recorded'
    }

    apiLogger.error('PaymentExecution upsert failed', e, { clientExecutionId: data.executionId })
    if (e instanceof Error && 'code' in e) {
      throw new ApiError(500, 'Could not record execution', DB_UPSERT_FAILED, { prismaCode: e.message })
    }
    throw new ApiError(500, 'Could not record execution', DB_UNEXPECTED, { error: e })
  }
}
