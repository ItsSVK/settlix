'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, ChevronDown, CreditCard, RefreshCw, UsersRound } from 'lucide-react'
import Image from 'next/image'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'
import { SkeletonRow } from '@/components/shared/skeletons'
import { getLogoByMint } from '@/lib/tokens/tokens'
import type { Subscription, SubscriptionPlan } from '@/lib/hooks/use-subscriptions'
import { SubscriptionRow } from './subscription-row'
import { CreateSubscriptionDialog } from './create-subscription-dialog'

const INTERVAL_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
}

interface SubscriptionPlansListProps {
  plans: SubscriptionPlan[]
  subscriptions: Subscription[]
  isLoading: boolean
  hasError: boolean
  onRefresh: () => void
  cancelSubscription: (id: string) => Promise<void>
}

function formatTokenAmount(amount: string) {
  return Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function PlanStatus({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${active ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-muted-foreground'}`} />
      {active ? 'Live' : 'Paused'}
    </span>
  )
}

function PlanRow({
  plan,
  subscribers,
  index,
  onRefresh,
  cancelSubscription,
}: {
  plan: SubscriptionPlan
  subscribers: Subscription[]
  index: number
  onRefresh: () => void
  cancelSubscription: (id: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(index === 0)
  const logo = getLogoByMint(plan.token)
  const activeSubscribers = subscribers.filter((subscriber) => subscriber.status === 'active').length
  const nextRenewals = subscribers.filter((subscriber) => subscriber.status !== 'cancelled').length

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.04 }}
      className='overflow-hidden rounded-2xl border border-border/40 bg-card shadow-[0_6px_16px_rgba(15,23,42,0.06)] transition-all hover:border-border/70 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] dark:shadow-none dark:hover:shadow-none'
    >
      <button
        type='button'
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className='flex w-full flex-col gap-4 p-4 text-left transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:flex-row sm:items-center sm:justify-between'
      >
        <span className='flex min-w-0 items-start gap-3'>
          <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/40'>
            {logo ? (
              <Image src={logo} alt='' width={22} height={22} />
            ) : (
              <CreditCard className='h-5 w-5 text-muted-foreground' aria-hidden='true' />
            )}
          </span>
          <span className='min-w-0'>
            <span className='flex flex-wrap items-center gap-2'>
              <span className='truncate text-sm font-semibold text-foreground'>
                {plan.title || 'Untitled subscription plan'}
              </span>
              <PlanStatus active={plan.active} />
            </span>
            <span className='mt-1 block line-clamp-2 text-xs text-muted-foreground'>
              {plan.description || 'Recurring payment plan'}
            </span>
            <span className='mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-foreground'>
              <span>{formatTokenAmount(plan.amount)}</span>
              <span className='text-muted-foreground'>/ {INTERVAL_LABELS[plan.interval] ?? plan.interval}</span>
              <span className='hidden text-muted-foreground sm:inline'>•</span>
              <span className='text-muted-foreground'>Created {new Date(plan.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </span>
          </span>
        </span>

        <span className='grid w-full grid-cols-3 gap-2 sm:w-auto sm:min-w-[280px]'>
          <span className='rounded-xl border border-border/50 bg-background/70 px-3 py-2'>
            <span className='block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>Subscribers</span>
            <span className='mt-1 flex items-baseline gap-1 text-sm font-bold text-foreground'>
              {activeSubscribers}
              <span className='text-[10px] font-medium text-muted-foreground'>active</span>
            </span>
          </span>
          <span className='rounded-xl border border-border/50 bg-background/70 px-3 py-2'>
            <span className='block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>Total</span>
            <span className='mt-1 text-sm font-bold text-foreground'>{subscribers.length}</span>
          </span>
          <span className='flex items-center justify-between rounded-xl border border-border/50 bg-background/70 px-3 py-2'>
            <span>
              <span className='block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>Renewing</span>
              <span className='mt-1 text-sm font-bold text-foreground'>{nextRenewals}</span>
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
              aria-hidden='true'
            />
          </span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeInOut' }}
            className='overflow-hidden'
          >
            <div className='border-t border-border/40 bg-muted/20 p-4'>
              <div className='mb-3 flex items-center justify-between gap-3'>
                <div>
                  <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>Subscribers</p>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    Select a subscriber to view renewal transactions and subscription details.
                  </p>
                </div>
                <div className='hidden items-center gap-2 rounded-full border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground sm:flex'>
                  <RefreshCw className='h-3.5 w-3.5' aria-hidden='true' />
                  {INTERVAL_LABELS[plan.interval] ?? plan.interval}
                </div>
              </div>

              {subscribers.length > 0 ? (
                <div className='space-y-3'>
                  {subscribers.map((subscription) => (
                    <SubscriptionRow
                      key={subscription.id}
                      subscription={subscription}
                      onRefresh={onRefresh}
                      onCancel={cancelSubscription}
                    />
                  ))}
                </div>
              ) : (
                <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-card/50 px-4 py-10 text-center'>
                  <UsersRound className='h-8 w-8 text-muted-foreground' aria-hidden='true' />
                  <p className='mt-3 text-sm font-semibold text-foreground'>No subscribers yet</p>
                  <p className='mt-1 max-w-sm text-xs text-muted-foreground'>
                    This plan is visible now. Subscribers will collect here after customers authorize recurring payments.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function SubscriptionPlansList({
  plans,
  subscriptions,
  isLoading,
  hasError,
  onRefresh,
  cancelSubscription,
}: SubscriptionPlansListProps) {
  const subscriptionsByPlan = useMemo(() => {
    return subscriptions.reduce<Record<string, Subscription[]>>((acc, subscription) => {
      acc[subscription.planId] = acc[subscription.planId] ?? []
      acc[subscription.planId].push(subscription)
      return acc
    }, {})
  }, [subscriptions])

  if (isLoading) {
    return (
      <div className='space-y-3'>
        {[1, 2, 3].map((item) => (
          <SkeletonRow key={item} />
        ))}
      </div>
    )
  }

  if (hasError) {
    return (
      <div className='flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card px-4 py-12 text-center'>
        <AlertCircle className='h-8 w-8 text-destructive' aria-hidden='true' />
        <p className='mt-3 text-sm font-semibold text-foreground'>Could not load subscriptions</p>
        <p className='mt-1 max-w-sm text-xs text-muted-foreground'>
          Refresh the list once your session or network connection is ready.
        </p>
        <Button variant='outline' size='sm' onClick={onRefresh} className='mt-5 h-10 rounded-xl'>
          <RefreshCw className='mr-2 h-3.5 w-3.5' aria-hidden='true' />
          Retry
        </Button>
      </div>
    )
  }

  if (plans.length === 0) {
    return (
      <EmptyState
        title='No subscription plans yet'
        description='Create a recurring plan and it will appear here immediately, even before the first subscriber.'
        action={<CreateSubscriptionDialog onCreated={onRefresh} />}
      />
    )
  }

  return (
    <div className='space-y-4'>
      {plans.map((plan, index) => (
        <PlanRow
          key={plan.id}
          plan={plan}
          subscribers={subscriptionsByPlan[plan.id] ?? []}
          index={index}
          onRefresh={onRefresh}
          cancelSubscription={cancelSubscription}
        />
      ))}
      <div className='flex justify-end'>
        <Button variant='outline' size='sm' onClick={onRefresh} className='h-10 rounded-xl'>
          <RefreshCw className='mr-2 h-3.5 w-3.5' aria-hidden='true' />
          Refresh
        </Button>
      </div>
    </div>
  )
}
