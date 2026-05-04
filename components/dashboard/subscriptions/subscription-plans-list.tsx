'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertCircle,
  Check,
  ChevronDown,
  Copy,
  CreditCard,
  Loader2,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  UsersRound,
} from 'lucide-react'
import Image from 'next/image'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'
import { SkeletonRow } from '@/components/shared/skeletons'
import { ConfirmationModal } from '@/components/shared/confirmation-modal'
import { getLogoByMint } from '@/lib/tokens/tokens'
import { copyText } from '@/lib/utils'
import { INTERVAL_LABEL as INTERVAL_LABELS } from '@/lib/subscriptions/constants'
import type { Subscription, SubscriptionPlan } from '@/lib/hooks/use-subscriptions'
import { SubscriptionRow } from './subscription-row'
import { CreateSubscriptionDialog } from './create-subscription-dialog'

interface SubscriptionPlansListProps {
  plans: SubscriptionPlan[]
  subscriptions: Subscription[]
  isLoading: boolean
  hasError: boolean
  onRefresh: () => void
  cancelSubscription: (id: string) => Promise<void>
  togglePlanActive: (id: string, active: boolean) => Promise<void>
  togglePlanActivePending: boolean
  archivePlan: (id: string) => Promise<void>
  archivePlanPending: boolean
}

function formatTokenAmount(amount: string) {
  return Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function PlanStatus({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${active ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}
    >
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
  togglePlanActive,
  togglePlanActivePending,
  archivePlan,
  archivePlanPending,
}: {
  plan: SubscriptionPlan
  subscribers: Subscription[]
  index: number
  onRefresh: () => void
  cancelSubscription: (id: string) => Promise<void>
  togglePlanActive: (id: string, active: boolean) => Promise<void>
  togglePlanActivePending: boolean
  archivePlan: (id: string) => Promise<void>
  archivePlanPending: boolean
}) {
  const [expanded, setExpanded] = useState(index === 0)
  const [copied, setCopied] = useState(false)
  const logo = getLogoByMint(plan.token)
  const activeSubscribers = subscribers.filter((s) => s.status === 'active').length
  const nextRenewals = subscribers.filter((s) => s.status !== 'cancelled').length

  const subscribeUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/subscribe/${plan.id}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.04 }}
      className='overflow-hidden rounded-2xl border border-border/40 bg-card shadow-[0_6px_16px_rgba(15,23,42,0.06)] transition-all hover:border-border/70 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] dark:shadow-none dark:hover:shadow-none'
    >
      {/* Plan header row */}
      <div className='flex items-center gap-3 p-4'>
        {/* Expand trigger — left side only */}
        <button
          type='button'
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className='flex min-w-0 flex-1 items-start gap-3 text-left transition-colors hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card'
        >
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
              <span className='text-muted-foreground'>
                Created{' '}
                {new Date(plan.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </span>
          </span>
        </button>

        {/* Stats mini-grid */}
        <div className='hidden w-auto min-w-[200px] grid-cols-3 gap-2 sm:grid'>
          <span className='rounded-xl border border-border/50 bg-background/70 px-3 py-2'>
            <span className='block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
              Subscribers
            </span>
            <span className='mt-1 flex items-baseline gap-1 text-sm font-bold text-foreground'>
              {activeSubscribers}
              <span className='text-[10px] font-medium text-muted-foreground'>active</span>
            </span>
          </span>
          <span className='rounded-xl border border-border/50 bg-background/70 px-3 py-2'>
            <span className='block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>Total</span>
            <span className='mt-1 text-sm font-bold text-foreground'>{subscribers.length}</span>
          </span>
          <span className='rounded-xl border border-border/50 bg-background/70 px-3 py-2'>
            <span className='block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
              Renewing
            </span>
            <span className='mt-1 text-sm font-bold text-foreground'>{nextRenewals}</span>
          </span>
        </div>

        {/* Action strip */}
        <div className='flex items-center gap-1 rounded-xl border border-border/30 bg-muted/40 pl-2'>
          {/* Copy subscribe link */}
          <Button
            onClick={() => copyText(subscribeUrl, setCopied)}
            title='Copy subscribe link'
            variant='ghost'
            size='sm'
            className='h-8 w-8 rounded-lg p-0 text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground'
          >
            {copied ? <Check className='h-3.5 w-3.5 text-green-500' /> : <Copy className='h-3.5 w-3.5' />}
          </Button>

          <div className='mx-1 h-4 w-px bg-border/50' />

          {/* Toggle active */}
          {togglePlanActivePending ? (
            <div className='flex h-8 w-8 items-center justify-center'>
              <Loader2
                className={`h-3.5 w-3.5 animate-spin ${plan.active ? 'text-green-500' : 'text-muted-foreground'}`}
              />
            </div>
          ) : (
            <Button
              onClick={() => void togglePlanActive(plan.id, !plan.active)}
              title={plan.active ? 'Deactivate plan' : 'Activate plan'}
              variant='ghost'
              size='sm'
              className='h-8 w-8 rounded-lg p-0 text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground'
            >
              {plan.active ? (
                <ToggleRight className='h-5 w-5 text-green-500' />
              ) : (
                <ToggleLeft className='h-5 w-5' />
              )}
            </Button>
          )}

          {/* Archive */}
          <ConfirmationModal
            className='h-8 w-8 rounded-lg p-0 text-red-500 transition-colors hover:bg-background/80 hover:text-foreground'
            onConfirm={archivePlan}
            isPending={archivePlanPending}
            id={plan.id}
            type='Archive'
          />

          {/* Expand chevron */}
          <button
            type='button'
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            className='flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground'
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
              aria-hidden='true'
            />
          </button>
        </div>
      </div>

      {/* Subscribers panel */}
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
                    Select a subscriber to view renewal transactions and details.
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
                    Share the subscribe link — customers will appear here after authorizing recurring payments.
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
  togglePlanActive,
  togglePlanActivePending,
  archivePlan,
  archivePlanPending,
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
          togglePlanActive={togglePlanActive}
          togglePlanActivePending={togglePlanActivePending}
          archivePlan={archivePlan}
          archivePlanPending={archivePlanPending}
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
