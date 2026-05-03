import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { DB_QUERY_FAILED, DB_UPDATE_FAILED } from '@/lib/api/constants'
import { apiLogger } from '@/lib/api/logger'

export interface PartnerOwed {
  wallet: string
  /** Raw USDC units (6-decimal integer, as string to avoid JS bigint overflow) */
  owedRaw: string
}

export interface PendingDistributions {
  executionIds: string[]
  executionCount: number
  partners: PartnerOwed[]
  /** Sum of all partner amounts, raw USDC units as string */
  totalOwedRaw: string
}

/**
 * Returns all paid, undistributed executions for split-links owned by this
 * merchant, and aggregates how much is owed to each partner.
 */
export async function getPendingDistributions(merchantWallet: string): Promise<PendingDistributions> {
  try {
    const executions = await prisma.paymentExecution.findMany({
      where: {
        status: 'paid',
        distributedAt: null,
        link: {
          merchant: { wallet: merchantWallet },
          recipients: {
            some: { wallet: { not: merchantWallet } },
          },
        },
      },
      include: {
        link: {
          include: {
            recipients: {
              where: { wallet: { not: merchantWallet } },
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    })

    const partnerTotals = new Map<string, bigint>()

    for (const exec of executions) {
      const outputRaw = exec.outputAmount
      for (const recipient of exec.link!.recipients) {
        const owed = (outputRaw * BigInt(recipient.basisPoints)) / BigInt(10000)
        partnerTotals.set(recipient.wallet, (partnerTotals.get(recipient.wallet) ?? BigInt(0)) + owed)
      }
    }

    const partners: PartnerOwed[] = Array.from(partnerTotals.entries()).map(([wallet, owedRaw]) => ({
      wallet,
      owedRaw: owedRaw.toString(),
    }))

    const totalOwedRaw = Array.from(partnerTotals.values())
      .reduce((a, b) => a + b, BigInt(0))
      .toString()

    return {
      executionIds: executions.map((e) => e.id),
      executionCount: executions.length,
      partners,
      totalOwedRaw,
    }
  } catch (e) {
    apiLogger.error('getPendingDistributions failed', e, { merchantWallet })
    throw new ApiError(500, 'Database error', DB_QUERY_FAILED, { error: e })
  }
}

/**
 * Marks a batch of executions as distributed.
 * Only updates records that are confirmed paid, not yet distributed,
 * and belong to the requesting merchant — so mismatched IDs are silently ignored.
 */
export async function markAsDistributed(executionIds: string[], merchantWallet: string): Promise<number> {
  if (executionIds.length === 0) return 0
  try {
    const result = await prisma.paymentExecution.updateMany({
      where: {
        id: { in: executionIds },
        status: 'paid',
        distributedAt: null,
        link: { merchant: { wallet: merchantWallet } },
      },
      data: { distributedAt: new Date() },
    })
    return result.count
  } catch (e) {
    apiLogger.error('markAsDistributed failed', e, { merchantWallet })
    throw new ApiError(500, 'Could not mark executions as distributed', DB_UPDATE_FAILED, { error: e })
  }
}
