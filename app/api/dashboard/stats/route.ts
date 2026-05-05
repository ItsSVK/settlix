import { type NextRequest, NextResponse } from 'next/server'

import { handleApi } from '@/lib/api/errors'
import { requireSession } from '@/lib/auth/require-auth'
import { prisma } from '@/lib/db'
import { deriveInvoiceStatus } from '@/lib/services/invoice.service'

const DAYS = 30

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const { wallet } = await requireSession(req)

    const [paidExecutions, allExecutionStatuses, links, invoices, subscribers] = await Promise.all([
      prisma.paymentExecution.findMany({
        where: { status: 'paid', link: { merchant: { wallet } } },
        select: {
          id: true,
          outputAmount: true,
          createdAt: true,
          linkId: true,
          userWallet: true,
          txSignature: true,
          link: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.paymentExecution.findMany({
        where: { link: { merchant: { wallet } } },
        select: { status: true },
      }),
      prisma.paymentLink.findMany({
        where: { merchant: { wallet }, archivedAt: null },
        select: {
          id: true,
          title: true,
          active: true,
          executions: {
            where: { status: 'paid' },
            select: { outputAmount: true },
          },
        },
      }),
      prisma.invoice.findMany({
        where: { merchant: { wallet }, archivedAt: null },
        select: {
          dueDate: true,
          executions: {
            where: { status: 'paid' },
            select: { createdAt: true },
            take: 1,
          },
        },
      }),
      prisma.subscriber.findMany({
        where: { plan: { merchant: { wallet }, archivedAt: null } },
        select: { status: true },
      }),
    ])

    const totalRevenue = paidExecutions.reduce((sum, e) => sum + Number(e.outputAmount) / 1_000_000, 0)
    const activeLinksCount = links.filter((l) => l.active).length
    const overallSuccessRate =
      allExecutionStatuses.length > 0
        ? Math.round(
            (allExecutionStatuses.filter((e) => e.status === 'paid').length / allExecutionStatuses.length) * 100,
          )
        : null

    const dayMap = new Map<string, number>()
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date()
      d.setUTCHours(0, 0, 0, 0)
      d.setUTCDate(d.getUTCDate() - i)
      dayMap.set(d.toISOString().slice(0, 10), 0)
    }
    for (const e of paidExecutions) {
      const day = e.createdAt.toISOString().slice(0, 10)
      if (dayMap.has(day)) {
        dayMap.set(day, (dayMap.get(day) ?? 0) + Number(e.outputAmount) / 1_000_000)
      }
    }
    const revenueByDay = Array.from(dayMap.entries()).map(([date, total]) => ({ date, total }))

    const topLinks = links
      .map((link) => ({
        id: link.id,
        title: link.title,
        volume: link.executions.reduce((sum, e) => sum + Number(e.outputAmount) / 1_000_000, 0),
        paidCount: link.executions.length,
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5)

    const recentTransactions = paidExecutions.slice(0, 10).map((e) => ({
      id: e.id,
      userWallet: e.userWallet,
      amount: Number(e.outputAmount) / 1_000_000,
      linkTitle: e.link?.title ?? null,
      txSignature: e.txSignature,
      createdAt: e.createdAt.toISOString(),
    }))

    const invoiceStats = { paid: 0, unpaid: 0, overdue: 0 }
    for (const inv of invoices) {
      const paidAt = inv.executions[0]?.createdAt ?? null
      const status = deriveInvoiceStatus(inv.dueDate, paidAt)
      invoiceStats[status]++
    }

    const subscriptionStats = { active: 0, past_due: 0, cancelled: 0 }
    for (const sub of subscribers) {
      if (sub.status === 'active') subscriptionStats.active++
      else if (sub.status === 'past_due') subscriptionStats.past_due++
      else if (sub.status === 'cancelled') subscriptionStats.cancelled++
    }

    return NextResponse.json({
      totalRevenue,
      activeLinksCount,
      totalTransactions: allExecutionStatuses.length,
      overallSuccessRate,
      revenueByDay,
      topLinks,
      recentTransactions,
      invoiceStats,
      subscriptionStats,
    })
  })
}
