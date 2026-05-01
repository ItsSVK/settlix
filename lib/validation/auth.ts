import { z } from 'zod'

export const walletLoginBody = z.object({
  wallet: z.string().min(32).max(64),
  /** Base64-encoded Ed25519 signature */
  signature: z.string().min(1),
  /** UUID nonce previously issued by GET /api/auth/nonce */
  nonce: z.string().uuid(),
})

export type WalletLoginBody = z.infer<typeof walletLoginBody>
