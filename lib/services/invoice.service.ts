import { ApiError } from '@/lib/api/errors'
import { DB_CREATE_FAILED, DB_QUERY_FAILED, DB_UNEXPECTED, NOT_FOUND, FORBIDDEN } from '@/lib/api/constants'
import { apiLogger } from '@/lib/api/logger'
import { prisma } from '@/lib/db'
import { Decimal } from '@/lib/generated/prisma/internal/prismaNamespace'
import { PaymentExecutionStatus } from '@/lib/generated/prisma/client'

export type InvoiceStatus = 'paid' | 'overdue' | 'unpaid'

function computeTotal(items: { quantity: number; unitPrice: number }[]): Decimal {
  return items.reduce(
    (acc, item) => acc.plus(new Decimal(item.quantity.toString()).times(new Decimal(item.unitPrice.toString()))),
    new Decimal(0),
  )
}

export function deriveInvoiceStatus(dueDate: Date | null, paidAt: Date | null): InvoiceStatus {
  if (paidAt) return 'paid'
  if (dueDate && dueDate < new Date()) return 'overdue'
  return 'unpaid'
}

export async function createInvoice(data: {
  merchantWallet: string
  clientName?: string
  clientEmail?: string
  dueDate?: Date
  memo?: string
  token: string
  lineItems: { description: string; quantity: number; unitPrice: number }[]
}) {
  const merchant = await prisma.merchant.findUnique({
    where: { wallet: data.merchantWallet },
    select: { id: true },
  })
  if (!merchant) throw new ApiError(404, 'Merchant not found', NOT_FOUND)

  const amount = computeTotal(data.lineItems)

  try {
    return await prisma.invoice.create({
      data: {
        merchantId: merchant.id,
        clientName: data.clientName ?? null,
        clientEmail: data.clientEmail ?? null,
        dueDate: data.dueDate ?? null,
        memo: data.memo ?? null,
        token: data.token,
        amount,
        lineItems: {
          create: data.lineItems.map((item) => ({
            description: item.description,
            quantity: new Decimal(item.quantity.toString()),
            unitPrice: new Decimal(item.unitPrice.toString()),
          })),
        },
      },
      include: { lineItems: true },
    })
  } catch (e) {
    apiLogger.error('Invoice create failed', e, { merchantWallet: data.merchantWallet })
    if (e instanceof Error && 'code' in e) {
      throw new ApiError(500, 'Could not create invoice', DB_CREATE_FAILED, { prismaCode: e.message })
    }
    throw new ApiError(500, 'Could not create invoice', DB_UNEXPECTED, { error: e })
  }
}

export async function getInvoiceById(id: string) {
  try {
    return await prisma.invoice.findFirst({
      where: { id, archivedAt: null },
      include: {
        lineItems: { orderBy: { id: 'asc' } },
        merchant: { select: { wallet: true, webhookUrl: true, webhookSecret: true } },
        executions: {
          where: { status: PaymentExecutionStatus.paid },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    })
  } catch (e) {
    apiLogger.error('Invoice findUnique failed', e, { id })
    if (e instanceof Error && 'code' in e) {
      throw new ApiError(500, 'Database error', DB_QUERY_FAILED, { prismaCode: e.message })
    }
    throw new ApiError(500, 'Database error', DB_UNEXPECTED, { error: e })
  }
}

export async function getInvoicesByWallet(merchantWallet: string) {
  try {
    return await prisma.invoice.findMany({
      where: { merchant: { wallet: merchantWallet }, archivedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        lineItems: true,
        executions: {
          where: { status: PaymentExecutionStatus.paid },
          select: { txSignature: true, createdAt: true },
          take: 1,
        },
      },
    })
  } catch (e) {
    apiLogger.error('Invoice findMany by wallet failed', e, { merchantWallet })
    if (e instanceof Error && 'code' in e) {
      throw new ApiError(500, 'Database error', DB_QUERY_FAILED, { prismaCode: e.message })
    }
    throw new ApiError(500, 'Database error', DB_UNEXPECTED, { error: e })
  }
}

export async function getInvoiceForReceipt(invoiceId: string) {
  try {
    return await prisma.invoice.findFirst({
      where: { id: invoiceId, archivedAt: null },
      select: {
        id: true,
        clientName: true,
        clientEmail: true,
        merchantId: true,
        merchant: { select: { wallet: true } },
        memo: true,
        token: true,
        amount: true,
        lineItems: { select: { description: true, quantity: true, unitPrice: true }, orderBy: { id: 'asc' } },
      },
    })
  } catch (e) {
    apiLogger.warn('getInvoiceForReceipt failed', { invoiceId, error: String(e) })
    return null
  }
}

export async function archiveInvoice(id: string, merchantWallet: string) {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id, archivedAt: null },
      include: { merchant: { select: { wallet: true } } },
    })
    if (!invoice) throw new ApiError(404, 'Invoice not found', NOT_FOUND)
    if (invoice.merchant.wallet !== merchantWallet) throw new ApiError(403, 'Forbidden', FORBIDDEN)
    await prisma.invoice.update({ where: { id }, data: { archivedAt: new Date() } })
  } catch (e) {
    if (e instanceof ApiError) throw e
    apiLogger.error('Invoice archive failed', e, { id })
    throw new ApiError(500, 'Could not archive invoice', DB_UNEXPECTED, { error: e })
  }
}
