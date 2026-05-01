import { z } from 'zod'

export const paymentLinkId = z.string().cuid()

export const splitRecipientInput = z.object({
  wallet: z.string().min(32).max(64),
  /** Integer basis points out of 10000 — e.g. 7000 = 70 % */
  basisPoints: z.number().int().min(1).max(9999),
})

export const createLinkBody = z.object({
  token: z.string().min(32).max(64),
  amount: z.union([z.number().positive(), z.string()]),
  title: z.string().max(80).optional(),
  description: z.string().max(300).optional(),
  /**
   * Optional split config — up to 10 recipients (including the merchant).
   * basisPoints across all entries must sum to exactly 10000.
   * If omitted the merchant wallet receives 100% of every payment.
   */
  recipients: z.array(splitRecipientInput).min(1).max(10).optional(),
  /** ISO 8601 datetime string — link stops accepting payments after this time. */
  expiresAt: z.string().datetime({ offset: true }).optional(),
  /** Maximum number of successful payments the link will accept. */
  maxUses: z.number().int().min(1).max(100_000).optional(),
})

export const updateLinkActiveBody = z.object({
  active: z.boolean(),
})

export type SplitRecipientInput = z.infer<typeof splitRecipientInput>
export type SplitRecipientInputArr = z.infer<typeof createLinkBody>['recipients']
export type CreateLinkBody = z.infer<typeof createLinkBody>
export type UpdateLinkActiveBody = z.infer<typeof updateLinkActiveBody>
