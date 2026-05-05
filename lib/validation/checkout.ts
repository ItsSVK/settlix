import { z } from 'zod'
import { paymentLinkId } from './links'

export const submitTxBody = z.object({
  executionId: z.uuid(),
  txSignature: z.string().min(80).max(128),
  source: z.enum(['payment_link', 'invoice']),
  linkId: paymentLinkId.optional(),
  invoiceId: z.string().cuid().optional(),
  userWallet: z.string().min(32).max(64).optional(),
  inputToken: z.string().min(32).max(64).optional(),
  inputAmount: z.string().optional(),
  outputAmount: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const jupiterOrderBody = z.object({
  inputMint: z.string().min(32).max(64),
  taker: z.string().min(32).max(64),
  payId: paymentLinkId.optional(),
  invoiceId: z.string().cuid().optional(),
})

/** Quote-only: no wallet / taker. */
export const jupiterQuoteBody = jupiterOrderBody.omit({ taker: true })

// Payment recording context shared by execute and send routes so they can call
// processSubmitTx server-side, eliminating the separate /api/submit-tx round-trip.
const paymentRecordContext = z.object({
  executionId: z.uuid(),
  source: z.enum(['payment_link', 'invoice']),
  linkId: paymentLinkId.optional(),
  invoiceId: z.string().cuid().optional(),
  userWallet: z.string().min(32).max(64),
  inputToken: z.string().min(32).max(64),
  inAmount: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const jupiterExecuteBody = z
  .object({
    signedTransaction: z.string().min(1),
    requestId: z.string().min(1),
  })
  .merge(paymentRecordContext)

export const sendTxBody = z
  .object({
    signedTransaction: z.string().min(1),
  })
  .merge(paymentRecordContext)

// ── Direct Pay (pay any address, no payment link required) ──────────────────
export const directPayQuoteBody = z.object({
  inputMint: z.string().min(32).max(64),
  receiverWallet: z.string().min(32).max(64),
  /** Human-decimal USDC amount the receiver should get, e.g. "10.50" */
  amount: z.string().regex(/^\d+(\.\d{0,6})?$/, 'Invalid amount'),
})

export const directPayOrderBody = z.object({
  inputMint: z.string().min(32).max(64),
  taker: z.string().min(32).max(64),
  receiverWallet: z.string().min(32).max(64),
  amount: z.string().regex(/^\d+(\.\d{0,6})?$/, 'Invalid amount'),
})

export const directPayExecuteBody = z.object({
  signedTransaction: z.string().min(1),
  requestId: z.string().min(1),
})

export const directPaySendBody = z.object({
  signedTransaction: z.string().min(1),
})

export type SubmitTxBody = z.infer<typeof submitTxBody>
export type JupiterOrderBody = z.infer<typeof jupiterOrderBody>
export type JupiterQuoteBody = z.infer<typeof jupiterQuoteBody>
export type JupiterExecuteBody = z.infer<typeof jupiterExecuteBody>
export type SendTxBody = z.infer<typeof sendTxBody>
export type DirectPayQuoteBody = z.infer<typeof directPayQuoteBody>
export type DirectPayOrderBody = z.infer<typeof directPayOrderBody>
export type DirectPayExecuteBody = z.infer<typeof directPayExecuteBody>
export type DirectPaySendBody = z.infer<typeof directPaySendBody>
