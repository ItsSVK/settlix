import { type NextRequest, NextResponse } from 'next/server'

import { getPaymentLinksByWallet } from '@/lib/services/payment-link.service'
import { handleApi } from '@/lib/api/errors'
import { requireAuth } from '@/lib/auth/require-auth'
import { PaymentExecution, SplitRecipient } from '@/lib/generated/prisma/client'

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    // Wallet comes from the authenticated session — not from a query param
    const { wallet } = await requireAuth(req)

    const links = await getPaymentLinksByWallet(wallet)

    const result = links.map((link) => {
      const executions = link.executions ?? []
      const paidCount = executions.filter((e: PaymentExecution) => e.status === 'paid').length
      const totalVolume = executions
        .filter((e: PaymentExecution) => e.status === 'paid')
        .reduce((sum: number, e: PaymentExecution) => sum + Number(e.outputAmount), 0)

      return {
        id: link.id,
        merchantWallet: link.merchantWallet,
        token: link.token,
        amount: link.amount.toString(),
        type: link.type,
        active: link.active,
        webhookUrl: link.webhookUrl ?? null,
        createdAt: link.createdAt.toISOString(),
        recipients: (link.recipients ?? []).map((r: SplitRecipient) => ({
          wallet: r.wallet,
          basisPoints: r.basisPoints,
        })),
        stats: {
          totalExecutions: executions.length,
          paidCount,
          failedCount: executions.filter((e: PaymentExecution) => e.status === 'failed').length,
          pendingCount: executions.filter((e: PaymentExecution) => e.status === 'pending').length,
          totalVolume: totalVolume.toFixed(2),
          successRate: executions.length > 0 ? Math.round((paidCount / executions.length) * 100) : null,
        },
        recentExecutions: executions.slice(0, 5).map((e: PaymentExecution) => ({
          id: e.id,
          userWallet: e.userWallet,
          inputToken: e.inputToken,
          inputAmount: e.inputAmount.toString(),
          outputAmount: e.outputAmount.toString(),
          txSignature: e.txSignature,
          status: e.status,
          createdAt: e.createdAt.toISOString(),
        })),
      }
    })

    return NextResponse.json({ links: result })
  })
}
