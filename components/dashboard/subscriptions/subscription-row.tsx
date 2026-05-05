'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, ExternalLink, ReceiptText, RefreshCw, XCircle } from 'lucide-react'
import Image from 'next/image'
import type { Subscription } from '@/lib/hooks/use-subscriptions'
import { useSubscriptions } from '@/lib/hooks/use-subscriptions'
import { Button } from '@/components/ui/button'
import { ConfirmationModal } from '@/components/shared/confirmation-modal'
import { getLogoByMint } from '@/lib/tokens/tokens'
import { shorten } from '@/lib/utils'
import { SOLSCAN_CLUSTER } from '@/lib/solana/constants'
import {
  SUBSCRIPTION_STATUS_STYLES as STATUS_STYLES,
  SUBSCRIPTION_STATUS_DOT as STATUS_DOT,
  SUBSCRIPTION_STATUS_LABELS as STATUS_LABELS,
  INTERVAL_LABEL as INTERVAL_LABELS,
} from '@/lib/subscriptions/constants'

const RENEWAL_STATUS_DOT: Record<string, string> = {
  succeeded: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]',
  pending: 'bg-amber-500',
  failed: 'bg-destructive',
}

interface SubscriptionRowProps {
  subscription: Subscription
}

export function SubscriptionRow({ subscription: sub }: SubscriptionRowProps) {
  const [expanded, setExpanded] = useState(false)
  const { cancelSubscription, cancelSubscriptionPending } = useSubscriptions()

  const isCancelled = sub.status === 'cancelled'
  const periodEnd = new Date(sub.currentPeriodEnd)
  const isOverdue = !isCancelled && periodEnd < new Date()
  const tokenLogo = getLogoByMint(sub.plan.token)

  return (
    <div className='group rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm shadow-sm transition-all hover:bg-card/60 hover:border-border/60 hover:shadow-md'>
      {/* Main row */}
      <div className='flex items-center gap-3 p-3.5'>
        <button
          type='button'
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className='flex min-h-11 flex-1 items-center gap-3 rounded-xl text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card'
        >
          {/* Status badge */}
          <span
            className={`flex items-center gap-1.5 rounded-full px-2 py-2 md:py-0.5 text-[9px] font-bold uppercase tracking-wider ${STATUS_STYLES[sub.status] ?? STATUS_STYLES.cancelled}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[sub.status] ?? STATUS_DOT.cancelled}`} />
            <span className='hidden md:flex'>{STATUS_LABELS[sub.status] ?? sub.status}</span>
          </span>

          {/* Info */}
          <span className='flex min-w-0 flex-1 flex-col'>
            <span className='truncate font-mono text-[12px] font-medium text-foreground'>
              {shorten(sub.subscriberWallet, 8, 6)}
            </span>
            <span className='flex flex-wrap items-center gap-1.5'>
              <span className='flex items-center gap-1 text-xs font-bold text-foreground'>
                {tokenLogo && <Image src={tokenLogo} alt='' width={14} height={14} className='inline-block' />}
                {Number(sub.plan.amount).toFixed(2)}
              </span>
              {sub.plan.interval && (
                <span className='flex items-center gap-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-500'>
                  <RefreshCw className='h-2.5 w-2.5' aria-hidden='true' />
                  {INTERVAL_LABELS[sub.plan.interval] ?? sub.plan.interval}
                </span>
              )}
              {sub.plan.title && (
                <span className='truncate text-[11px] text-muted-foreground max-w-[160px]'>• {sub.plan.title}</span>
              )}
            </span>
          </span>

          {/* Next billing */}
          <span className='hidden sm:flex flex-col items-end mx-2 opacity-70 group-hover:opacity-100 transition-opacity'>
            <span className='text-[9px] font-semibold text-muted-foreground uppercase tracking-wider'>
              {isCancelled ? 'Cancelled' : 'Next billing'}
            </span>
            <span
              className={`text-[12px] font-semibold ${isOverdue && !isCancelled ? 'text-amber-500' : 'text-foreground'}`}
            >
              {isCancelled && sub.cancelledAt
                ? new Date(sub.cancelledAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : periodEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </span>

          {/* Expand chevron */}
          <span className='hidden md:flex h-6 w-6 items-center justify-center rounded-full bg-muted/40 transition-colors group-hover:bg-muted/80 ml-1'>
            <ChevronDown
              className={`h-3 w-3 text-muted-foreground transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
              aria-hidden='true'
            />
          </span>
        </button>

        {/* Actions */}
        <div className='flex items-center gap-1 rounded-xl bg-muted/40 pl-2 border border-border/30'>
          <Button
            onClick={() =>
              window.open(`https://solscan.io/account/${sub.subscriberWallet}${SOLSCAN_CLUSTER}`, '_blank')
            }
            title='View on Solscan'
            aria-label='View subscriber wallet on Solscan'
            variant='ghost'
            size='sm'
            className='hidden md:flex h-6 w-6 rounded-lg p-0 text-muted-foreground hover:bg-background/80 hover:text-foreground transition-colors'
          >
            <ExternalLink className='h-3.5 w-3.5' />
          </Button>

          {!isCancelled && (
            <>
              <div className='w-px h-4 bg-border/50 mx-1' />
              <ConfirmationModal
                className='h-6 w-6 rounded-lg p-0 text-red-500 transition-colors hover:bg-background/80 hover:text-foreground'
                onConfirm={cancelSubscription}
                isPending={cancelSubscriptionPending}
                id={sub.id}
                type='Cancel'
              />
            </>
          )}
        </div>
      </div>

      {/* Expanded view */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className='overflow-hidden'
          >
            <div className='border-t border-border/30 bg-muted/10 px-3.5 pb-4 pt-3 space-y-3'>
              {/* Meta row */}
              <div className='flex flex-wrap gap-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider'>
                <span>
                  Subscribed:{' '}
                  {new Date(sub.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span className='hidden md:inline'>•</span>
                <a
                  href={`https://solscan.io/account/${sub.subscriberWallet}${SOLSCAN_CLUSTER}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='font-mono normal-case hover:text-foreground transition-colors'
                >
                  {sub.subscriberWallet}
                </a>
              </div>

              {/* Renewals */}
              {sub.renewals.length > 0 ? (
                <div className='space-y-1.5'>
                  <p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                    Renewal history
                  </p>
                  <div className='space-y-2'>
                    {sub.renewals.map((renewal) => (
                      <div
                        key={renewal.id}
                        className='flex items-center gap-2 rounded-xl bg-card border border-border/60 px-3 py-2.5'
                      >
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${RENEWAL_STATUS_DOT[renewal.status] ?? 'bg-muted-foreground'}`}
                        />
                        <div className='min-w-0 flex-1'>
                          <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
                            <span className='text-xs font-medium text-foreground capitalize'>{renewal.status}</span>
                            <span className='text-[11px] text-muted-foreground'>
                              {Number(renewal.amount).toFixed(2)} {renewal.token.slice(0, 4)}...
                            </span>
                          </div>
                          <p className='text-[11px] text-muted-foreground'>
                            {renewal.executedAt ? 'Paid' : 'Due'}{' '}
                            {new Date(renewal.executedAt ?? renewal.dueAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                            {renewal.executionStatus && ` • ${renewal.executionStatus}`}
                          </p>
                        </div>
                        {renewal.txSignature && (
                          <a
                            href={`https://solscan.io/tx/${renewal.txSignature}${SOLSCAN_CLUSTER}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='flex h-6 w-6 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card'
                            title='View transaction'
                            aria-label='View renewal transaction'
                          >
                            <ExternalLink className='h-3.5 w-3.5' />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className='flex items-center gap-2 rounded-xl bg-card border border-border/60 px-3 py-2.5 text-[11px] text-muted-foreground'>
                  <ReceiptText className='h-3.5 w-3.5 shrink-0' aria-hidden='true' />
                  No renewal transactions recorded yet.
                </div>
              )}

              {/* Cancelled notice */}
              {isCancelled && (
                <div className='flex items-center gap-2 text-[11px] text-muted-foreground'>
                  <XCircle className='h-3.5 w-3.5 text-destructive shrink-0' />
                  Subscription cancelled
                  {sub.cancelledAt &&
                    ` on ${new Date(sub.cancelledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
