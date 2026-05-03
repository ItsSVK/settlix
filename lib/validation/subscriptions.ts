import { z } from 'zod'

export const createSubscriptionPlanBody = z.object({
  token: z.string().min(32).max(64),
  amount: z.union([z.number().positive(), z.string()]),
  interval: z.enum(['weekly', 'monthly']),
  title: z.string().max(80).optional(),
  description: z.string().max(300).optional(),
})

export const authorizeSubscriptionBody = z.object({
  planId: z.string().uuid(),
  subscriberWallet: z.string().min(32).max(64),
})

export const createSubscriptionBody = z.object({
  planId: z.string().uuid(),
  subscriberWallet: z.string().min(32).max(64),
  signedTransaction: z.string().min(1),
  executionId: z.uuid(),
})

export type CreateSubscriptionPlanBody = z.infer<typeof createSubscriptionPlanBody>
export type AuthorizeSubscriptionBody = z.infer<typeof authorizeSubscriptionBody>
export type CreateSubscriptionBody = z.infer<typeof createSubscriptionBody>
