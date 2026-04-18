import { z } from 'zod'

export const paymentLinkId = z.string().cuid()

export const createLinkBody = z.object({
  token: z.string().min(32).max(64),
  amount: z.union([z.number().positive(), z.string()]),
  title: z.string().max(80).optional(),
  description: z.string().max(300).optional(),
})

export const updateLinkActiveBody = z.object({
  active: z.boolean(),
})

export const walletLoginBody = z.object({
  wallet: z.string().min(32).max(64),
  /** Base64-encoded Ed25519 signature */
  signature: z.string().min(1),
  /** UUID nonce previously issued by GET /api/auth/nonce */
  nonce: z.string().uuid(),
})

export const submitTxBody = z.object({
  executionId: z.uuid(),
  txSignature: z.string().min(80).max(128),
  linkId: paymentLinkId,
  userWallet: z.string().min(32).max(64).optional(),
  inputToken: z.string().min(32).max(64).optional(),
  inputAmount: z.string().optional(),
  outputAmount: z.string().optional(),
})

export const jupiterOrderBody = z.object({
  inputMint: z.string().min(32).max(64),
  taker: z.string().min(32).max(64),
  payId: paymentLinkId,
})

/** Quote-only: no wallet / taker. */
export const jupiterQuoteBody = jupiterOrderBody.omit({ taker: true })

// Payment recording context shared by execute and send routes so they can call
// processSubmitTx server-side, eliminating the separate /api/submit-tx round-trip.
const paymentRecordContext = z.object({
  executionId: z.uuid(),
  linkId: paymentLinkId,
  userWallet: z.string().min(32).max(64),
  inputToken: z.string().min(32).max(64),
  inAmount: z.string(),
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

export type DirectPayQuoteBody = z.infer<typeof directPayQuoteBody>
export type DirectPayOrderBody = z.infer<typeof directPayOrderBody>
export type DirectPayExecuteBody = z.infer<typeof directPayExecuteBody>
export type DirectPaySendBody = z.infer<typeof directPaySendBody>

export type CreateLinkBody = z.infer<typeof createLinkBody>
export type UpdateLinkActiveBody = z.infer<typeof updateLinkActiveBody>
export type WalletLoginBody = z.infer<typeof walletLoginBody>
export type SubmitTxBody = z.infer<typeof submitTxBody>
export type JupiterOrderBody = z.infer<typeof jupiterOrderBody>
export type JupiterQuoteBody = z.infer<typeof jupiterQuoteBody>
export type JupiterExecuteBody = z.infer<typeof jupiterExecuteBody>
export type SendTxBody = z.infer<typeof sendTxBody>
