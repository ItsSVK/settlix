'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Copy, Check, ToggleLeft, ToggleRight, RefreshCw, UsersRound, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useSubscriptionPlans, type Subscription, type SubscriptionPlan } from '@/lib/hooks/use-subscriptions'
import { SubscriptionRow } from './subscription-row'
import { ConfirmationModal } from '@/components/shared/confirmation-modal'
import { Button } from '@/components/ui/button'
import { getLogoByMint } from '@/lib/tokens/tokens'
import { copyText } from '@/lib/utils'
import { INTERVAL_LABEL as INTERVAL_LABELS } from '@/lib/subscriptions/constants'

function formatTokenAmount(amount: string) {
  return Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

interface SubscriptionPlanRowProps {
  plan: SubscriptionPlan
  subscribers: Subscription[]
  index: number
}

export function SubscriptionPlanRow({ plan, subscribers, index }: SubscriptionPlanRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const logo = getLogoByMint(plan.token)
  const { togglePlanActive, togglePlanActivePending, archivePlan, archivePlanPending } = useSubscriptionPlans()

  const activeSubscribers = subscribers.filter((s) => s.status === 'active').length
  const nextRenewals = subscribers.filter((s) => s.status !== 'cancelled').length
  const subscribeUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/subscribe/${plan.id}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.04 }}
      className='group rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm shadow-sm transition-all hover:bg-card/60 hover:border-border/60 hover:shadow-md'
    >
      {/* Main row */}
      <div className='flex cursor-pointer items-center gap-3 p-3.5' onClick={() => setExpanded((v) => !v)}>
        {/* Status Badge */}
        <div
          className={`flex items-center gap-1.5 rounded-full px-2 py-2 md:py-0.5 text-[9px] font-bold uppercase tracking-wider ${
            plan.active ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${plan.active ? 'bg-green-500' : 'bg-muted-foreground'}`} />
          <span className='hidden md:flex'>{plan.active ? 'Live' : 'Paused'}</span>
        </div>

        {/* Info */}
        <div className='flex flex-col flex-1 min-w-0'>
          <span className='truncate text-[13px] font-semibold text-foreground'>{plan.title || 'Untitled Plan'}</span>
          <div className='flex items-center gap-1.5 flex-wrap'>
            <span className='text-xs font-bold text-foreground flex items-center gap-1'>
              {logo && <Image src={logo} alt='token' width={16} height={16} className='inline-block' />}
              {formatTokenAmount(plan.amount)}
            </span>
            <span className='text-[11px] text-muted-foreground'>
              / {INTERVAL_LABELS[plan.interval] ?? plan.interval}
            </span>
            {plan.description && (
              <span className='truncate text-[11px] text-muted-foreground max-w-[200px]'>• {plan.description}</span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className='hidden items-center gap-4 sm:flex mx-3 opacity-70 group-hover:opacity-100 transition-opacity'>
          <div className='flex flex-col items-center justify-center'>
            <span className='text-[9px] font-semibold text-muted-foreground uppercase tracking-wider'>Subscribers</span>
            <span className='text-[13px] font-bold text-foreground'>{activeSubscribers}</span>
          </div>
          <div className='flex flex-col items-center justify-center'>
            <span className='text-[9px] font-semibold text-muted-foreground uppercase tracking-wider'>Renewing</span>
            <span className='text-[13px] font-bold text-foreground'>{nextRenewals}</span>
          </div>
        </div>

        {/* Actions Strip */}
        <div
          className='flex items-center gap-1 rounded-xl bg-muted/40 pl-2 border border-border/30'
          onClick={(e) => e.stopPropagation()}
        >
          {/* Copy subscribe link */}
          <Button
            onClick={() => copyText(subscribeUrl, setCopied)}
            title='Copy subscribe link'
            variant='ghost'
            size='sm'
            className='h-6 w-6 rounded-lg p-0 text-muted-foreground hover:bg-background/80 hover:text-foreground transition-colors'
          >
            {copied ? <Check className='h-3 w-3 text-green-500' /> : <Copy className='h-3 w-3' />}
          </Button>

          <div className='w-px h-4 bg-border/50 mx-1' />

          {/* Toggle active */}
          {togglePlanActivePending ? (
            <div className='flex items-center justify-center h-6 w-6'>
              <Loader2
                className={`h-3.5 w-3.5 animate-spin ${plan.active ? 'text-green-500' : 'text-muted-foreground'}`}
              />
            </div>
          ) : (
            <Button
              onClick={() => void togglePlanActive({ id: plan.id, active: !plan.active })}
              disabled={togglePlanActivePending}
              title={plan.active ? 'Deactivate plan' : 'Activate plan'}
              variant='ghost'
              size='sm'
              className='h-6 w-6 rounded-lg p-0 text-muted-foreground hover:bg-background/80 hover:text-foreground transition-colors'
            >
              {plan.active ? <ToggleRight className='h-5 w-5 text-green-500' /> : <ToggleLeft className='h-5 w-5' />}
            </Button>
          )}

          <ConfirmationModal
            className='text-red-500 h-6 w-6 rounded-lg p-0 hover:bg-background/80 hover:text-foreground transition-colors'
            onConfirm={archivePlan}
            isPending={archivePlanPending}
            id={plan.id}
            type='Archive'
          />
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
                    <SubscriptionRow key={subscription.id} subscription={subscription} />
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
