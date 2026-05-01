import { z } from 'zod'

function emptyStringToUndefined(value: unknown) {
  return typeof value === 'string' && value.trim() === '' ? undefined : value
}

const webhookUrlSchema = z
  .string()
  .trim()
  .url('Webhook URL must be a valid URL')
  .max(2048)
  .refine((url) => ['http:', 'https:'].includes(new URL(url).protocol), {
    message: 'Webhook URL must use http or https',
  })

const webhookSecretSchema = z
  .string()
  .trim()
  .min(16, 'Webhook secret must be at least 16 characters')
  .max(200, 'Webhook secret must be 200 characters or fewer')

export const paymentLinkWebhookBody = z
  .object({
    webhookUrl: z.preprocess(emptyStringToUndefined, webhookUrlSchema.optional()),
    webhookSecret: z.preprocess(emptyStringToUndefined, webhookSecretSchema.optional()),
  })
  .refine((data) => !data.webhookSecret || !!data.webhookUrl, {
    path: ['webhookUrl'],
    message: 'Webhook URL is required when a webhook secret is provided',
  })

export const webhookTestBody = z.object({
  webhookUrl: webhookUrlSchema,
  webhookSecret: z.preprocess(emptyStringToUndefined, webhookSecretSchema.optional()),
})

export type PaymentLinkWebhookBody = z.infer<typeof paymentLinkWebhookBody>
export type WebhookTestBody = z.infer<typeof webhookTestBody>
