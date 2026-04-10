import { z } from 'zod'

export const createLinkBody = z.object({
  token: z.string().min(32).max(64),
  amount: z.union([z.number().positive(), z.string()]),
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
  linkId: z.string().min(1),
  userWallet: z.string().min(32).max(64).optional(),
  inputToken: z.string().min(32).max(64).optional(),
  inputAmount: z.string().optional(),
  outputAmount: z.string().optional(),
})

export const jupiterOrderBody = z.object({
  inputMint: z.string().min(32).max(64),
  taker: z.string().min(32).max(64),
  payId: z.string().min(1),
})

/** Quote-only: no wallet / taker. */
export const jupiterQuoteBody = jupiterOrderBody.omit({ taker: true })

export const jupiterExecuteBody = z.object({
  signedTransaction: z.string().min(1),
  requestId: z.string().min(1),
})

export type CreateLinkBody = z.infer<typeof createLinkBody>
export type UpdateLinkActiveBody = z.infer<typeof updateLinkActiveBody>
export type WalletLoginBody = z.infer<typeof walletLoginBody>
export type SubmitTxBody = z.infer<typeof submitTxBody>
export type JupiterOrderBody = z.infer<typeof jupiterOrderBody>
export type JupiterQuoteBody = z.infer<typeof jupiterQuoteBody>
export type JupiterExecuteBody = z.infer<typeof jupiterExecuteBody>
