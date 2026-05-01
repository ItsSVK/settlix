import { ApiError } from '@/lib/api/errors'
import {
  DB_CREATE_FAILED,
  DB_QUERY_FAILED,
  DB_UNEXPECTED,
  DB_UPDATE_FAILED,
  FORBIDDEN,
  NOT_FOUND,
} from '@/lib/api/constants'
import { apiLogger } from '@/lib/api/logger'
import { prisma } from '@/lib/db'
import { Decimal } from '@/lib/generated/prisma/internal/prismaNamespace'
import { Prisma, PaymentExecutionStatus } from '@/lib/generated/prisma/client'
import type { SplitRecipientInput } from '@/lib/validation'

type PaymentLinkWithRelations = Prisma.PaymentLinkGetPayload<{
  include: { executions: true; recipients: true }
}>

export async function createPaymentLink(data: {
  merchantWallet: string
  token: string
  amount: Decimal
  title?: string
  description?: string
  recipients?: SplitRecipientInput[]
  expiresAt?: Date | null
  maxUses?: number | null
}) {
  try {
    return await prisma.paymentLink.create({
      data: {
        merchantWallet: data.merchantWallet,
        token: data.token,
        amount: data.amount,
        type: 'fixed',
        active: true,
        title: data.title ?? null,
        description: data.description ?? null,
        expiresAt: data.expiresAt ?? null,
        maxUses: data.maxUses ?? null,
        recipients:
          data.recipients && data.recipients.length > 0
            ? {
                create: data.recipients.map((r, i) => ({
                  wallet: r.wallet,
                  basisPoints: r.basisPoints,
                  displayOrder: i,
                })),
              }
            : undefined,
      },
      include: { recipients: { orderBy: { displayOrder: 'asc' } } },
    })
  } catch (e) {
    apiLogger.error('PaymentLink create failed', e, { merchantWallet: data.merchantWallet })
    if (e instanceof Error && 'code' in e) {
      throw new ApiError(500, 'Could not create payment link', DB_CREATE_FAILED, { prismaCode: e.message })
    }
    throw new ApiError(500, 'Could not create payment link', DB_UNEXPECTED, { error: e })
  }
}

export async function getPaymentLinkById(id: string) {
  try {
    return await prisma.paymentLink.findFirst({
      where: { id, archivedAt: null },
      include: {
        recipients: { orderBy: { displayOrder: 'asc' } },
        _count: { select: { executions: { where: { status: PaymentExecutionStatus.paid } } } },
        merchant: { select: { webhookUrl: true, webhookSecret: true } },
      },
    })
  } catch (e) {
    apiLogger.error('PaymentLink findUnique failed', e, { id })
    if (e instanceof Error && 'code' in e) {
      throw new ApiError(500, 'Database error', DB_QUERY_FAILED, { prismaCode: e.message })
    }
    throw new ApiError(500, 'Database error', DB_UNEXPECTED, { error: e })
  }
}

export async function getPaymentLinksByWallet(merchantWallet: string): Promise<PaymentLinkWithRelations[]> {
  try {
    return await prisma.paymentLink.findMany({
      where: { merchantWallet, archivedAt: null, NOT: { type: 'invoice' } },
      orderBy: { createdAt: 'desc' },
      include: {
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        recipients: { orderBy: { displayOrder: 'asc' } },
      },
    })
  } catch (e) {
    apiLogger.error('PaymentLink findMany by wallet failed', e, { merchantWallet })
    if (e instanceof Error && 'code' in e) {
      throw new ApiError(500, 'Database error', DB_QUERY_FAILED, { prismaCode: e.message })
    }
    throw new ApiError(500, 'Database error', DB_UNEXPECTED, { error: e })
  }
}

export async function archivePaymentLink(id: string, merchantWallet: string) {
  try {
    const link = await prisma.paymentLink.findFirst({ where: { id, archivedAt: null } })
    if (!link) throw new ApiError(404, 'Payment link not found', NOT_FOUND)
    if (link.merchantWallet !== merchantWallet) throw new ApiError(403, 'Not authorized', FORBIDDEN)
    await prisma.paymentLink.update({ where: { id }, data: { archivedAt: new Date() } })
  } catch (e) {
    if (e instanceof ApiError) throw e
    apiLogger.error('PaymentLink delete failed', e, { id })
    throw new ApiError(500, 'Could not delete payment link', DB_UNEXPECTED, { error: e })
  }
}

export async function updatePaymentLinkActive(id: string, merchantWallet: string, active: boolean) {
  try {
    const link = await prisma.paymentLink.findUnique({ where: { id } })
    if (!link) {
      throw new ApiError(404, 'Payment link not found', NOT_FOUND)
    }
    if (link.merchantWallet !== merchantWallet) {
      throw new ApiError(403, 'Not authorized to update this link', FORBIDDEN)
    }
    return await prisma.paymentLink.update({
      where: { id },
      data: { active },
    })
  } catch (e) {
    if (e instanceof ApiError) throw e
    apiLogger.error('PaymentLink update active failed', e, { id })
    if (e instanceof Error && 'message' in e) {
      throw new ApiError(500, 'Could not update payment link', DB_UPDATE_FAILED, { error: e.message })
    }
    throw new ApiError(500, 'Could not update payment link', DB_UNEXPECTED, { error: e })
  }
}
