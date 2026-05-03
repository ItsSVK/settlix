import { PaymentExecutionStatus, Prisma } from '@/lib/generated/prisma/client'
import type { PaymentExecutionSource } from '@/lib/generated/prisma/enums'
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
import { humanToRawAmount } from '@/lib/solana/amount'
import { createServerConnection } from '@/lib/solana/connection'
import { RPC_COMMITMENT } from '@/lib/solana/constants'
import { verifyPaymentTransaction } from '@/lib/solana/verify'
import { publishDashboardPaymentPaid } from '@/lib/realtime/dashboard-stream'

import { getPaymentLinkById } from './payment-link.service'
import { getInvoiceById } from './invoice.service'
import { deliverPaymentWebhook } from './payment-webhook.service'
import { sendInvoiceReceiptIfApplicable } from './invoice-email.service'

export type SubmitTxOutcome = { ok: true } | { ok: false; reason: string; httpStatus: number; code: string }

// Callers must supply source + the matching id field.
// Using a flat optional shape and asserting inside avoids discriminated-union
// narrowing issues that arise with isolatedModules + Prisma enum namespacing.
export type ProcessTxInput = {
  source: PaymentExecutionSource
  executionId: string
  txSignature: string
  linkId?: string
  invoiceId?: string
  userWallet?: string
  inputToken?: string
  inputAmount?: string
  outputAmount?: string
  metadata?: Record<string, unknown>
}

export async function processSubmitTx(input: ProcessTxInput): Promise<SubmitTxOutcome> {
  if (input.source === 'invoice') {
    if (!input.invoiceId) throw new ApiError(400, 'invoiceId required', 'VALIDATION')
    return processInvoiceTx({ ...input, invoiceId: input.invoiceId })
  }
  if (!input.linkId) throw new ApiError(400, 'linkId required', 'VALIDATION')
  return processPaymentLinkTx({ ...input, linkId: input.linkId })
}

// ---------------------------------------------------------------------------
// Payment link path
// ---------------------------------------------------------------------------

async function processPaymentLinkTx(
  body: Omit<ProcessTxInput, 'linkId'> & { linkId: string },
): Promise<SubmitTxOutcome> {
  const link = await getPaymentLinkById(body.linkId)
  if (!link || !link.active) {
    return { ok: false, reason: 'Link not found', httpStatus: 404, code: LINK_NOT_FOUND }
  }

  if (link.maxUses !== null && link._count.executions >= link.maxUses) {
    return { ok: false, reason: 'Payment limit reached', httpStatus: 409, code: LINK_SOLD_OUT }
  }

  const merchantWallet = link.merchant.wallet
  const connection = createServerConnection()
  const mintPk = new PublicKey(link.token)
  const mintInfo = await getMint(connection, mintPk, RPC_COMMITMENT)
  const expectedRaw = humanToRawAmount(link.amount, mintInfo.decimals)

  const tx = await connection.getTransaction(body.txSignature, {
    commitment: RPC_COMMITMENT,
    maxSupportedTransactionVersion: 0,
  })

  if (!tx) {
    await upsertPaymentExecution({
      source: 'payment_link',
      executionId: body.executionId,
      linkId: body.linkId,
      merchantWallet,
      txSignature: body.txSignature,
      userWallet: body.userWallet ?? UNKNOWN_PAYER_WALLET,
      inputToken: body.inputToken ?? link.token,
      inputAmount: BigInt(body.inputAmount ?? '0'),
      outputAmount: BigInt(body.outputAmount ?? '0'),
      status: PaymentExecutionStatus.failed,
      settlementToken: link.token,
      metadata: body.metadata ?? null,
      webhookUrl: link.merchant.webhookUrl ?? null,
      webhookSecret: link.merchant.webhookSecret ?? null,
    })
    return { ok: false, reason: 'Transaction not found on RPC', httpStatus: 400, code: TX_NOT_FOUND }
  }

  const decompiled = await decompileVersionedTransactionMessage(connection, tx.transaction.message)
  const userWallet = body.userWallet ?? decompiled.payerKey.toBase58()

  const verify = await verifyPaymentTransaction({
    connection,
    tx,
    merchantWallet,
    settlementMint: link.token,
    expectedRaw,
  })

  const inputToken = body.inputToken ?? link.token
  const inputAmountBig = BigInt(body.inputAmount ?? '0')
  const outputAmountBig =
    body.outputAmount !== undefined && body.outputAmount !== ''
      ? BigInt(body.outputAmount)
      : humanToRawAmount(link.amount, mintInfo.decimals)

  const status = verify.ok ? PaymentExecutionStatus.paid : PaymentExecutionStatus.failed

  const upsertResult = await upsertPaymentExecution({
    source: 'payment_link',
    executionId: body.executionId,
    linkId: body.linkId,
    merchantWallet,
    txSignature: body.txSignature,
    userWallet,
    inputToken,
    inputAmount: inputAmountBig,
    outputAmount: outputAmountBig,
    status,
    settlementToken: link.token,
    metadata: body.metadata ?? null,
    webhookUrl: link.merchant.webhookUrl ?? null,
    webhookSecret: link.merchant.webhookSecret ?? null,
  })

  if (upsertResult === 'already_recorded') return { ok: true }
  if (!verify.ok) return { ok: false, reason: verify.reason, httpStatus: 400, code: VERIFY_FAILED }

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Invoice path
// ---------------------------------------------------------------------------

async function processInvoiceTx(
  body: Omit<ProcessTxInput, 'invoiceId'> & { invoiceId: string },
): Promise<SubmitTxOutcome> {
  const invoice = await getInvoiceById(body.invoiceId)
  if (!invoice) {
    return { ok: false, reason: 'Invoice not found', httpStatus: 404, code: LINK_NOT_FOUND }
  }

  // Invoice is single-use — reject if already paid
  if (invoice.executions.length > 0) {
    return { ok: false, reason: 'Invoice already paid', httpStatus: 409, code: LINK_SOLD_OUT }
  }

  const merchantWallet = invoice.merchant.wallet
  const connection = createServerConnection()
  const mintPk = new PublicKey(invoice.token)
  const mintInfo = await getMint(connection, mintPk, RPC_COMMITMENT)
  const expectedRaw = humanToRawAmount(invoice.amount, mintInfo.decimals)

  const tx = await connection.getTransaction(body.txSignature, {
    commitment: RPC_COMMITMENT,
    maxSupportedTransactionVersion: 0,
  })

  if (!tx) {
    await upsertPaymentExecution({
      source: 'invoice',
      executionId: body.executionId,
      invoiceId: body.invoiceId,
      merchantWallet,
      txSignature: body.txSignature,
      userWallet: body.userWallet ?? UNKNOWN_PAYER_WALLET,
      inputToken: body.inputToken ?? invoice.token,
      inputAmount: BigInt(body.inputAmount ?? '0'),
      outputAmount: BigInt(body.outputAmount ?? '0'),
      status: PaymentExecutionStatus.failed,
      settlementToken: invoice.token,
      metadata: body.metadata ?? null,
      webhookUrl: invoice.merchant.webhookUrl ?? null,
      webhookSecret: invoice.merchant.webhookSecret ?? null,
    })
    return { ok: false, reason: 'Transaction not found on RPC', httpStatus: 400, code: TX_NOT_FOUND }
  }

  const decompiled = await decompileVersionedTransactionMessage(connection, tx.transaction.message)
  const userWallet = body.userWallet ?? decompiled.payerKey.toBase58()

  const verify = await verifyPaymentTransaction({
    connection,
    tx,
    merchantWallet,
    settlementMint: invoice.token,
    expectedRaw,
  })

  const inputToken = body.inputToken ?? invoice.token
  const inputAmountBig = BigInt(body.inputAmount ?? '0')
  const outputAmountBig =
    body.outputAmount !== undefined && body.outputAmount !== ''
      ? BigInt(body.outputAmount)
      : humanToRawAmount(invoice.amount, mintInfo.decimals)

  const status = verify.ok ? PaymentExecutionStatus.paid : PaymentExecutionStatus.failed

  const upsertResult = await upsertPaymentExecution({
    source: 'invoice',
    executionId: body.executionId,
    invoiceId: body.invoiceId,
    merchantWallet,
    txSignature: body.txSignature,
    userWallet,
    inputToken,
    inputAmount: inputAmountBig,
    outputAmount: outputAmountBig,
    status,
    settlementToken: invoice.token,
    metadata: body.metadata ?? null,
    webhookUrl: invoice.merchant.webhookUrl ?? null,
    webhookSecret: invoice.merchant.webhookSecret ?? null,
  })

  if (upsertResult === 'already_recorded') return { ok: true }
  if (!verify.ok) return { ok: false, reason: verify.reason, httpStatus: 400, code: VERIFY_FAILED }

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Shared upsert
// ---------------------------------------------------------------------------

type UpsertResult = 'ok' | 'already_recorded'

type UpsertPaymentExecutionData = {
  executionId: string
  merchantWallet: string
  txSignature: string
  userWallet: string
  inputToken: string
  inputAmount: bigint
  outputAmount: bigint
  status: PaymentExecutionStatus
  settlementToken: string
  metadata?: Record<string, unknown> | null
  webhookUrl?: string | null
  webhookSecret?: string | null
} & (
  | { source: 'payment_link'; linkId: string; invoiceId?: never }
  | { source: 'invoice'; invoiceId: string; linkId?: never }
)

async function upsertPaymentExecution(data: UpsertPaymentExecutionData): Promise<UpsertResult> {
  try {
    const existing = await prisma.paymentExecution.findUnique({
      where: { clientExecutionId: data.executionId },
      select: { status: true },
    })

    const saved = await prisma.paymentExecution.upsert({
      where: { clientExecutionId: data.executionId },
      create: {
        clientExecutionId: data.executionId,
        source: data.source,
        ...(data.source === 'payment_link' ? { linkId: data.linkId } : { invoiceId: data.invoiceId }),
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
        ...(data.source === 'payment_link' ? { linkId: data.linkId } : { invoiceId: data.invoiceId }),
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
            ...(data.source === 'payment_link' ? { linkId: data.linkId } : { invoiceId: data.invoiceId }),
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

      if (data.source === 'invoice') {
        void sendInvoiceReceiptIfApplicable(data.invoiceId, data.txSignature, data.inputToken, data.inputAmount)
      }
    }

    return 'ok'
  } catch (e) {
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
