import { type NextRequest, NextResponse } from 'next/server'

import { handleApi } from '@/lib/api/errors'
import { requireSession } from '@/lib/auth/require-auth'
import { prisma } from '@/lib/db'
import { deriveInvoiceStatus } from '@/lib/services/invoice.service'

const DAYS = 30

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const { wallet } = await requireSession(req)

    const merchant = await prisma.merchant.findUnique({ where: { wallet }, select: { id: true } })
    const merchantId = merchant?.id

    const [
      linkPaid,
      linkStatuses,
      invoicePaid,
      subscriptionPaid,
      directPaid,
      links,
      invoices,
      subscribers,
    ] = await Promise.all([
      // Payment link executions
      prisma.paymentExecution.findMany({
        where: { status: 'paid', link: { merchant: { wallet } } },
        select: {
          id: true,
          outputAmount: true,
          createdAt: true,
          userWallet: true,
          txSignature: true,
          link: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // All link-based statuses (for success rate)
      prisma.paymentExecution.findMany({
        where: { link: { merchant: { wallet } } },
        select: { status: true },
      }),
      // Invoice executions
      prisma.paymentExecution.findMany({
        where: { status: 'paid', invoice: { merchant: { wallet } } },
        select: {
          id: true,
          outputAmount: true,
          createdAt: true,
          userWallet: true,
          txSignature: true,
          invoice: { select: { clientName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // Subscription renewal executions
      prisma.paymentExecution.findMany({
        where: {
          status: 'paid',
          renewal: { subscriber: { plan: { merchant: { wallet } } } },
        },
        select: {
          id: true,
          outputAmount: true,
          createdAt: true,
          userWallet: true,
          txSignature: true,
          renewal: {
            select: {
              subscriber: { select: { subscriberName: true, plan: { select: { title: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // Direct transfer executions (personal pay link + landing page send)
      merchantId
        ? prisma.paymentExecution.findMany({
            where: { source: 'direct_transfer', merchantId, status: 'paid' },
            select: {
              id: true,
              outputAmount: true,
              createdAt: true,
              userWallet: true,
              txSignature: true,
              metadata: true,
            },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
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

    // Merge all paid executions with a human-readable source label.
    const allPaid = [
      ...linkPaid.map((e) => ({ ...e, linkTitle: e.link?.title ?? 'Payment Link' })),
      ...invoicePaid.map((e) => ({
        ...e,
        linkTitle: e.invoice?.clientName ? `Invoice · ${e.invoice.clientName}` : 'Invoice',
      })),
      ...subscriptionPaid.map((e) => {
        const sub = e.renewal?.subscriber
        const planTitle = sub?.plan?.title
        const name = sub?.subscriberName
        return {
          ...e,
          linkTitle: planTitle ? `Subscription · ${planTitle}` : name ? `Subscription · ${name}` : 'Subscription',
        }
      }),
      ...directPaid.map((e) => ({
        ...e,
        linkTitle: (e.metadata as { label?: string } | null)?.label ?? 'Direct Transfer',
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    const totalRevenue = allPaid.reduce((sum, e) => sum + Number(e.outputAmount) / 1_000_000, 0)
    const activeLinksCount = links.filter((l) => l.active).length

    const totalPaidCount = allPaid.length
    const totalAttempts =
      linkStatuses.length + invoicePaid.length + subscriptionPaid.length + directPaid.length
    const overallSuccessRate =
      totalAttempts > 0 ? Math.round((totalPaidCount / totalAttempts) * 100) : null

    const dayMap = new Map<string, number>()
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date()
      d.setUTCHours(0, 0, 0, 0)
      d.setUTCDate(d.getUTCDate() - i)
      dayMap.set(d.toISOString().slice(0, 10), 0)
    }
    for (const e of allPaid) {
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

    const recentTransactions = allPaid.slice(0, 10).map((e) => ({
      id: e.id,
      userWallet: e.userWallet,
      amount: Number(e.outputAmount) / 1_000_000,
      linkTitle: e.linkTitle,
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
      totalTransactions: totalAttempts,
      overallSuccessRate,
      revenueByDay,
      topLinks,
      recentTransactions,
      invoiceStats,
      subscriptionStats,
    })
  })
}
