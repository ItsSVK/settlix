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
  const total = computeTotal(data.lineItems)

  try {
    return await prisma.$transaction(async (tx) => {
      const link = await tx.paymentLink.create({
        data: {
          merchantWallet: data.merchantWallet,
          token: data.token,
          amount: total,
          type: 'invoice',
          active: true,
          maxUses: 1,
          title: data.clientName ? `Invoice · ${data.clientName}` : 'Invoice',
        },
      })

      return await tx.invoice.create({
        data: {
          merchantWallet: data.merchantWallet,
          clientName: data.clientName ?? null,
          clientEmail: data.clientEmail ?? null,
          dueDate: data.dueDate ?? null,
          memo: data.memo ?? null,
          token: data.token,
          linkId: link.id,
          lineItems: {
            create: data.lineItems.map((item) => ({
              description: item.description,
              quantity: new Decimal(item.quantity.toString()),
              unitPrice: new Decimal(item.unitPrice.toString()),
            })),
          },
        },
        include: { lineItems: true, link: true },
      })
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
        link: {
          include: {
            executions: {
              where: { status: PaymentExecutionStatus.paid },
              orderBy: { createdAt: 'asc' },
              take: 1,
            },
            recipients: { orderBy: { displayOrder: 'asc' } },
          },
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
      where: { merchantWallet, archivedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        lineItems: true,
        link: {
          select: {
            id: true,
            amount: true,
            executions: {
              where: { status: PaymentExecutionStatus.paid },
              select: { txSignature: true, createdAt: true },
              take: 1,
            },
          },
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

export async function archiveInvoice(id: string, merchantWallet: string) {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id, archivedAt: null },
      select: { merchantWallet: true, linkId: true },
    })
    if (!invoice) throw new ApiError(404, 'Invoice not found', NOT_FOUND)
    if (invoice.merchantWallet !== merchantWallet) throw new ApiError(403, 'Forbidden', FORBIDDEN)
    await prisma.$transaction([
      prisma.invoice.update({ where: { id }, data: { archivedAt: new Date() } }),
      prisma.paymentLink.update({ where: { id: invoice.linkId }, data: { archivedAt: new Date() } }),
    ])
  } catch (e) {
    if (e instanceof ApiError) throw e
    apiLogger.error('Invoice delete failed', e, { id })
    throw new ApiError(500, 'Could not delete invoice', DB_UNEXPECTED, { error: e })
  }
}
