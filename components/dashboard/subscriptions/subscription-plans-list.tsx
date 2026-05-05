'use client'

import { useMemo } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'
import { SkeletonRow } from '@/components/shared/skeletons'
import { useSubscriptions, type Subscription, type SubscriptionPlan } from '@/lib/hooks/use-subscriptions'
import { CreateSubscriptionDialog } from './create-subscription-dialog'
import { SubscriptionPlanRow } from './subscription-plan-row'

interface SubscriptionPlansListProps {
  plans: SubscriptionPlan[]
  subscriptions: Subscription[]
  isLoading: boolean
  hasError: boolean
}

export function SubscriptionPlansList({ plans, subscriptions, isLoading, hasError }: SubscriptionPlansListProps) {
  const { refresh } = useSubscriptions()
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
        <Button variant='outline' size='sm' onClick={() => refresh()} className='mt-5 h-10 rounded-xl'>
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
        action={<CreateSubscriptionDialog />}
      />
    )
  }

  return (
    <div className='space-y-4'>
      {plans.map((plan, index) => (
        <SubscriptionPlanRow key={plan.id} plan={plan} subscribers={subscriptionsByPlan[plan.id] ?? []} index={index} />
      ))}
    </div>
  )
}
