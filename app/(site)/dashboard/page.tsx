'use client'

import { motion } from 'motion/react'
import { DollarSign, Link as LinkIcon, FileText, TrendingUp } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-context'
import { useDashboardStats } from '@/lib/hooks/use-dashboard-stats'
import { StatCard } from '@/components/dashboard/overview/stat-card'
import { RevenueChart } from '@/components/dashboard/overview/revenue-chart'
import { TopLinksChart } from '@/components/dashboard/overview/top-links-chart'
import { InvoiceStatusChart } from '@/components/dashboard/overview/invoice-status-chart'
import { RecentTransactions } from '@/components/dashboard/overview/recent-transactions'

export default function DashboardOverviewPage() {
  const { wallet } = useAuth()
  const { data: stats, isLoading } = useDashboardStats()

  const totalRevenue = stats
    ? `$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '$0.00'

  const successRate = stats?.overallSuccessRate != null ? `${stats.overallSuccessRate}%` : '—'

  return (
    <div className='flex-1 bg-muted/40 dark:bg-background/90 min-h-screen'>
      <div className='mx-auto max-w-6xl px-6 py-8'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className='mb-8'
        >
          <h1 className='text-3xl font-bold tracking-tight text-foreground'>Welcome back,</h1>
          <p className='text-muted-foreground mt-1'>
            {wallet ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : 'Merchant'} · Here&apos;s your business at a
            glance.
          </p>
        </motion.div>

        {/* Stat cards */}
        <div className='grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6'>
          <StatCard
            title='Total Revenue'
            value={totalRevenue}
            sub={`${stats?.totalTransactions ?? 0} total transactions`}
            icon={DollarSign}
            delay={0.1}
            loading={isLoading}
          />
          <StatCard
            title='Active Links'
            value={isLoading ? '—' : String(stats?.activeLinksCount ?? 0)}
            sub='Non-archived payment links'
            icon={LinkIcon}
            delay={0.15}
            loading={isLoading}
          />
          <StatCard
            title='Invoices Paid'
            value={isLoading ? '—' : String(stats?.invoiceStats.paid ?? 0)}
            sub={`${stats?.invoiceStats.overdue ?? 0} overdue`}
            icon={FileText}
            delay={0.2}
            loading={isLoading}
          />
          <StatCard
            title='Success Rate'
            value={isLoading ? '—' : successRate}
            sub={`${stats?.totalTransactions ?? 0} total attempts`}
            icon={TrendingUp}
            delay={0.25}
            loading={isLoading}
          />
        </div>

        {/* Revenue chart */}
        <div className='mb-6'>
          <RevenueChart data={stats?.revenueByDay ?? []} loading={isLoading} />
        </div>

        {/* Bottom row */}
        <div className='grid gap-6 lg:grid-cols-5 mb-6'>
          <div className='lg:col-span-3'>
            <TopLinksChart data={stats?.topLinks ?? []} loading={isLoading} />
          </div>
          <div className='lg:col-span-2'>
            <InvoiceStatusChart data={stats?.invoiceStats ?? { paid: 0, unpaid: 0, overdue: 0 }} loading={isLoading} />
          </div>
        </div>

        {/* Recent transactions */}
        <RecentTransactions data={stats?.recentTransactions ?? []} loading={isLoading} />
      </div>
    </div>
  )
}
