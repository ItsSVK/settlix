'use client'

const SOLSCAN_CLUSTER = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet' ? '?cluster=devnet' : ''

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, ExternalLink, RefreshCw, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import type { Subscription } from '@/lib/hooks/use-subscriptions'
import { Button } from '@/components/ui/button'
import { ConfirmationModal } from '@/components/shared/confirmation-modal'
import { getLogoByMint } from '@/lib/tokens/tokens'

function shorten(s: string, start = 6, end = 4) {
  return `${s.slice(0, start)}…${s.slice(-end)}`
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-500/10 text-green-500',
  past_due: 'bg-amber-500/10 text-amber-500',
  cancelled: 'bg-muted text-muted-foreground',
}

const STATUS_DOT: Record<string, string> = {
  active: 'bg-green-500',
  past_due: 'bg-amber-500',
  cancelled: 'bg-muted-foreground',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  past_due: 'Past Due',
  cancelled: 'Cancelled',
}

const INTERVAL_LABELS: Record<string, string> = {
  weekly: 'weekly',
  monthly: 'monthly',
}

interface SubscriptionRowProps {
  subscription: Subscription
  onCancel: (id: string) => Promise<void>
  onRefresh: () => void
}

export function SubscriptionRow({ subscription: sub, onCancel, onRefresh }: SubscriptionRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)

  const isCancelled = sub.status === 'cancelled'
  const isPastDue = sub.status === 'past_due'
  const periodEnd = new Date(sub.currentPeriodEnd)
  const isOverdue = !isCancelled && periodEnd < new Date()

  const handleCancel = async (id: string) => {
    setCancelling(id)
    try {
      await onCancel(id)
      onRefresh()
    } catch {
      toast.error('Failed to cancel subscription')
    } finally {
      setCancelling(null)
      setConfirmCancel(null)
    }
  }

  return (
    <div className='group rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm shadow-sm transition-all hover:bg-card/60 hover:border-border/60 hover:shadow-md'>
      {/* Main row */}
      <div className='flex cursor-pointer items-center gap-3 p-3.5' onClick={() => setExpanded((v) => !v)}>
        {/* Status badge */}
        <div
          className={`flex items-center gap-1.5 rounded-full px-2 py-2 md:py-0.5 text-[9px] font-bold uppercase tracking-wider ${STATUS_STYLES[sub.status] ?? STATUS_STYLES.cancelled}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[sub.status] ?? STATUS_DOT.cancelled}`} />
          <span className='hidden md:flex'>{STATUS_LABELS[sub.status] ?? sub.status}</span>
        </div>

        {/* Info */}
        <div className='flex flex-col flex-1 min-w-0'>
          <a
            href={`https://solscan.io/account/${sub.subscriberWallet}${SOLSCAN_CLUSTER}`}
            target='_blank'
            rel='noopener noreferrer'
            className='truncate font-mono text-[12px] font-medium text-foreground hover:text-primary transition-colors'
            onClick={(e) => e.stopPropagation()}
          >
            {shorten(sub.subscriberWallet, 8, 6)}
          </a>
          <div className='flex items-center gap-1.5 flex-wrap'>
            <span className='text-xs font-bold text-foreground flex items-center gap-1'>
              <Image
                src={getLogoByMint(sub.plan.token) ?? ''}
                alt='token'
                width={14}
                height={14}
                className='inline-block'
              />
              {Number(sub.plan.amount).toFixed(2)}
            </span>
            {sub.plan.interval && (
              <span className='flex items-center gap-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-500'>
                <RefreshCw className='h-2.5 w-2.5' />
                {INTERVAL_LABELS[sub.plan.interval] ?? sub.plan.interval}
              </span>
            )}
            {sub.plan.title && (
              <span className='truncate text-[11px] text-muted-foreground max-w-[160px]'>• {sub.plan.title}</span>
            )}
          </div>
        </div>

        {/* Next billing */}
        <div className='hidden sm:flex flex-col items-end mx-2 opacity-70 group-hover:opacity-100 transition-opacity'>
          <span className='text-[9px] font-semibold text-muted-foreground uppercase tracking-wider'>
            {isCancelled ? 'Cancelled' : 'Next billing'}
          </span>
          <span className={`text-[12px] font-semibold ${isOverdue && !isCancelled ? 'text-amber-500' : 'text-foreground'}`}>
            {isCancelled && sub.cancelledAt
              ? new Date(sub.cancelledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
              : periodEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        {/* Actions */}
        <div className='flex items-center gap-1 rounded-xl bg-muted/40 pl-2 border border-border/30' onClick={(e) => e.stopPropagation()}>
          <Button
            onClick={() => window.open(`https://solscan.io/account/${sub.subscriberWallet}${SOLSCAN_CLUSTER}`, '_blank')}
            title='View on Solscan'
            variant='ghost'
            size='sm'
            className='hidden md:flex h-6 w-6 rounded-lg p-0 text-muted-foreground hover:bg-background/80 hover:text-foreground transition-colors'
          >
            <ExternalLink className='h-3 w-3' />
          </Button>

          {!isCancelled && (
            <>
              <div className='w-px h-4 bg-border/50 mx-1' />
              <ConfirmationModal
                className='text-red-500 h-6 w-6 rounded-lg p-0 hover:bg-background/80 hover:text-foreground transition-colors'
                handleArchive={handleCancel}
                archiving={cancelling}
                confirmArchive={confirmCancel}
                setConfirmArchive={setConfirmCancel}
                item={{ id: sub.id }}
                type='Cancel'
              />
            </>
          )}
        </div>

        {/* Expand chevron */}
        <div className='hidden md:flex h-6 w-6 items-center justify-center rounded-full bg-muted/40 transition-colors group-hover:bg-muted/80 ml-1'>
          <ChevronDown
            className={`h-3 w-3 text-muted-foreground transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          />
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

              {/* Last renewal */}
              {sub.lastRenewal && (
                <div className='space-y-1.5'>
                  <p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>Last renewal</p>
                  <div className='flex items-center gap-2 rounded-xl bg-card border border-border/60 px-3 py-2.5'>
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        sub.lastRenewal.status === 'succeeded'
                          ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                          : sub.lastRenewal.status === 'pending'
                            ? 'bg-amber-500'
                            : 'bg-destructive'
                      }`}
                    />
                    <span className='text-xs font-medium text-foreground capitalize'>{sub.lastRenewal.status}</span>
                    {sub.lastRenewal.executedAt && (
                      <span className='text-[11px] text-muted-foreground ml-1'>
                        {new Date(sub.lastRenewal.executedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                    {sub.lastRenewal.txSignature && (
                      <a
                        href={`https://solscan.io/tx/${sub.lastRenewal.txSignature}${SOLSCAN_CLUSTER}`}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='ml-auto flex items-center justify-center h-6 w-6 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors'
                        title='View transaction'
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className='h-3 w-3' />
                      </a>
                    )}
                  </div>
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
