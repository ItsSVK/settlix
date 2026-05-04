'use client'

import { motion } from 'motion/react'
import { useSubscriptionPlans, useSubscriptions } from '@/lib/hooks/use-subscriptions'
import { SubscriptionPlansList } from '@/components/dashboard/subscriptions/subscription-plans-list'
import { CreateSubscriptionDialog } from '@/components/dashboard/subscriptions/create-subscription-dialog'
import { SkeletonGrid } from '@/components/shared/skeletons'
import { StatsBar } from '@/components/dashboard/stats-bar'

export default function SubscriptionsPage() {
  const { subscriptions, isLoading, error: subscriptionsError, refresh, cancelSubscription } = useSubscriptions()
  const {
    plans,
    isLoading: plansLoading,
    error: plansError,
    refresh: refreshPlans,
    togglePlanActive,
    togglePlanActivePending,
    archivePlan,
    archivePlanPending,
  } = useSubscriptionPlans()
  const isPageLoading = isLoading || plansLoading
  const hasError = Boolean(subscriptionsError || plansError)

  const refreshAll = () => {
    void refresh()
    void refreshPlans()
  }

  const active = subscriptions.filter((s) => s.status === 'active').length
  const pastDue = subscriptions.filter((s) => s.status === 'past_due').length
  const mrr = subscriptions.filter((s) => s.status === 'active').reduce((sum, s) => sum + parseFloat(s.plan.amount), 0)

  const stats = [
    { label: 'Plans', value: plans.length },
    { label: 'Active subscribers', value: active },
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
          className='mb-8 flex items-center justify-between flex-col gap-4 sm:flex-row'
        >
          <div>
            <h1 className='text-2xl font-bold text-foreground'>Subscriptions</h1>
            <p className='mt-1 text-sm text-muted-foreground'>
              Manage recurring plans, subscriber status, and renewal history from one place.
            </p>
          </div>
          <CreateSubscriptionDialog onCreated={refreshAll} />
        </motion.div>

        {/* Stats */}
        {isPageLoading ? (
          <SkeletonGrid />
        ) : (
          plans.length > 0 && (
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
              Plans {!isPageLoading && `(${plans.length})`}
            </h2>
          </div>
          <SubscriptionPlansList
            plans={plans}
            subscriptions={subscriptions}
            isLoading={isPageLoading}
            hasError={hasError}
            onRefresh={refreshAll}
            cancelSubscription={cancelSubscription}
            togglePlanActive={togglePlanActive}
            togglePlanActivePending={togglePlanActivePending}
            archivePlan={archivePlan}
            archivePlanPending={archivePlanPending}
          />
        </motion.div>
      </div>
    </div>
  )
}
