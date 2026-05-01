import { z } from 'zod'

function emptyStringToUndefined(value: unknown) {
  return typeof value === 'string' && value.trim() === '' ? undefined : value
}

export const invoiceLineItemSchema = z.object({
  description: z.string().trim().min(1, 'Description required').max(200),
  quantity: z.number().positive('Must be positive').max(100_000),
  unitPrice: z.number().positive('Must be positive').max(1_000_000),
})

export const createInvoiceBody = z.object({
  clientName: z.string().trim().min(1).max(100).optional(),
  clientEmail: z.preprocess(emptyStringToUndefined, z.string().email('Invalid email').optional()),
  dueDate: z.string().datetime({ offset: true }).optional(),
  memo: z.string().trim().max(1000).optional(),
  token: z.string().min(32).max(64),
  lineItems: z.array(invoiceLineItemSchema).min(1, 'At least one line item required').max(50),
})

export type CreateInvoiceBody = z.infer<typeof createInvoiceBody>
export type InvoiceLineItem = z.infer<typeof invoiceLineItemSchema>
