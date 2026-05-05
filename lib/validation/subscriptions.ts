import { z } from 'zod'

export const createSubscriptionPlanBody = z.object({
  token: z.string().min(32).max(64),
  amount: z.union([z.number().positive(), z.string()]),
  interval: z.enum(['daily', 'weekly']),
  title: z.string().min(1, 'Plan name is required').max(70),
  description: z.string().max(300).optional(),
})

export const authorizeSubscriptionBody = z.object({
  planId: z.string().cuid(),
  subscriberWallet: z.string().min(32).max(64),
  subscriberName: z.string().max(100).optional(),
  subscriberEmail: z.string().email().optional(),
})

export const createSubscriptionBody = z.object({
  planId: z.string().cuid(),
  subscriberWallet: z.string().min(32).max(64),
  signedTransaction: z.string().min(1),
  executionId: z.uuid(),
  subscriberName: z.string().max(100).optional(),
  subscriberEmail: z.string().email().optional(),
})

export const updatePlanActiveBody = z.object({
  active: z.boolean(),
})

export type CreateSubscriptionPlanBody = z.infer<typeof createSubscriptionPlanBody>
export type AuthorizeSubscriptionBody = z.infer<typeof authorizeSubscriptionBody>
export type CreateSubscriptionBody = z.infer<typeof createSubscriptionBody>
export type UpdatePlanActiveBody = z.infer<typeof updatePlanActiveBody>
