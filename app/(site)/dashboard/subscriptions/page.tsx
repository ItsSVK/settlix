'use client'

import { motion } from 'motion/react'
import { useSubscriptions } from '@/lib/hooks/use-subscriptions'
import { SubscriptionsTable } from '@/components/dashboard/subscriptions/subscriptions-table'
import { CreateSubscriptionDialog } from '@/components/dashboard/subscriptions/create-subscription-dialog'
import { SkeletonGrid } from '@/components/shared/skeletons'
import { StatsBar } from '@/components/dashboard/stats-bar'

export default function SubscriptionsPage() {
  const { subscriptions, isLoading, refresh, cancelSubscription } = useSubscriptions()

  const active = subscriptions.filter((s) => s.status === 'active').length
  const pastDue = subscriptions.filter((s) => s.status === 'past_due').length
  const cancelled = subscriptions.filter((s) => s.status === 'cancelled').length
  const mrr = subscriptions
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + parseFloat(s.plan.amount), 0)

  const stats = [
    { label: 'Total subscribers', value: subscriptions.length },
    { label: 'Active', value: active },
    { label: 'Past due', value: pastDue },
    { label: 'Active value (USDC)', value: mrr, format: 'usdc' as const },
  ]

  return (
    <div className='flex-1 bg-muted/40 dark:bg-background'>
      <div className='mx-auto max-w-6xl px-6 py-6'>
        {/* Header */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className='mb-8 flex items-center justify-between'
        >
          <h1 className='text-2xl font-bold text-foreground'>Subscriptions</h1>
          <CreateSubscriptionDialog onCreated={refresh} />
        </motion.div>

        {/* Stats */}
        {isLoading ? (
          <SkeletonGrid />
        ) : (
          subscriptions.length > 0 && (
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className='mb-8'
            >
              <StatsBar stats={stats} />
            </motion.div>
          )
        )}

        {/* Table */}
        <motion.div initial={false} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'>
              Subscribers {!isLoading && `(${subscriptions.length})`}
            </h2>
          </div>
          <SubscriptionsTable
            subscriptions={subscriptions}
            isLoading={isLoading}
            onRefresh={refresh}
            cancelSubscription={cancelSubscription}
          />
        </motion.div>
      </div>
    </div>
  )
}
