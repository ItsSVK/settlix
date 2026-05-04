'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CheckCircle, ExternalLink, RefreshCw, XCircle } from 'lucide-react'
import Image from 'next/image'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { shorten } from '@/lib/utils'
import { SOLSCAN_CLUSTER } from '@/lib/solana/constants'
import {
  SUBSCRIPTION_STATUS_STYLES as STATUS_STYLES,
  SUBSCRIPTION_STATUS_DOT as STATUS_DOT,
  SUBSCRIPTION_STATUS_LABELS as STATUS_LABELS,
  INTERVAL_UNIT as INTERVAL_LABELS,
} from '@/lib/subscriptions/constants'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const RENEWAL_DOT: Record<string, string> = {
  succeeded: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]',
  pending: 'bg-amber-500',
  failed: 'bg-destructive',
}

export interface ManagedSubscription {
  id: string
  subscriberWallet: string
  status: string
  currentPeriodEnd: string
  cancelledAt: string | null
  createdAt: string
  plan: {
    title: string | null
    amount: string
    token: string
    tokenSymbol: string
    tokenLogo: string | null
    interval: string
    merchantWallet: string
  }
  renewals: {
    id: string
    status: string
    txSignature: string | null
    dueAt: string
    executedAt: string | null
  }[]
}


function CancelButton({
  subscriptionId,
  subscriberWallet,
  onCancelled,
}: {
  subscriptionId: string
  subscriberWallet: string
  onCancelled: () => void
}) {
  const { publicKey, connected } = useWallet()
  const { setVisible } = useWalletModal()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  const isOwner = connected && publicKey?.toBase58() === subscriberWallet

  const handleCancel = async () => {
    if (!publicKey) return
    setPending(true)
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: publicKey.toBase58() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to cancel subscription')
      }
      toast.success('Subscription cancelled')
      setOpen(false)
      onCancelled()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to cancel subscription')
    } finally {
      setPending(false)
    }
  }

  if (!connected) {
    return (
      <button
        onClick={() => setVisible(true)}
        className='flex w-full items-center justify-center gap-2 rounded-xl border border-border/50 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground'
      >
        Connect wallet to manage
      </button>
    )
  }

  if (!isOwner) {
    return (
      <p className='text-center text-xs text-muted-foreground'>
        Connected wallet does not match the subscriber wallet for this subscription.
      </p>
    )
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (!pending) setOpen(v)
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant='outline'
          className='w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive'
        >
          <XCircle className='mr-2 h-4 w-4' />
          Cancel subscription
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        size='sm'
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault()
        }}
      >
        <AlertDialogHeader>
          <AlertDialogMedia className='bg-destructive/10 text-destructive dark:bg-destructive/20'>
            <XCircle />
          </AlertDialogMedia>
          <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
          <AlertDialogDescription>
            This will stop future renewals. Your access continues until the current period ends. The on-chain token
            delegation will remain — you can revoke it from your wallet.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant='outline'>Keep it</AlertDialogCancel>
          <Button variant='destructive' onClick={() => void handleCancel()} disabled={pending}>
            {pending ? 'Cancelling…' : 'Yes, cancel'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function ManageSubscriptionCard({ subscription: sub }: { subscription: ManagedSubscription | null }) {
  const [cancelled, setCancelled] = useState(false)
  const currentStatus = cancelled ? 'cancelled' : (sub?.status ?? 'cancelled')

  const body = (() => {
    if (!sub) {
      return (
        <motion.div
          key='not-found'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className='py-10 text-center space-y-2'
        >
          <p className='text-2xl'>🔍</p>
          <p className='text-sm font-medium text-foreground'>Subscription not found</p>
          <p className='text-xs text-muted-foreground'>
            This link may be invalid or the subscription has been removed.
          </p>
        </motion.div>
      )
    }

    return (
      <motion.div key='details' initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='space-y-4'>
        {/* Status + billing */}
        <div className='rounded-xl border border-border/30 bg-muted/20 p-4 space-y-3'>
          <div className='flex items-center justify-between'>
            <span className='text-xs text-muted-foreground'>Status</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[currentStatus] ?? STATUS_STYLES.cancelled}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[currentStatus] ?? STATUS_DOT.cancelled}`} />
              {STATUS_LABELS[currentStatus] ?? currentStatus}
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-xs text-muted-foreground'>Amount</span>
            <span className='flex items-center gap-1.5 text-sm font-semibold text-foreground'>
              {sub.plan.tokenLogo && <Image src={sub.plan.tokenLogo} alt='' width={14} height={14} />}
              {Number(sub.plan.amount).toFixed(2)}{' '}
              <span className='font-normal text-muted-foreground'>
                {sub.plan.tokenSymbol} / {INTERVAL_LABELS[sub.plan.interval] ?? sub.plan.interval}
              </span>
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-xs text-muted-foreground'>
              {currentStatus === 'cancelled' ? 'Cancelled on' : 'Next billing'}
            </span>
            <span className='text-sm font-semibold text-foreground'>
              {currentStatus === 'cancelled' && sub.cancelledAt
                ? new Date(sub.cancelledAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-xs text-muted-foreground'>Merchant</span>
            <a
              href={`https://solscan.io/account/${sub.plan.merchantWallet}${SOLSCAN_CLUSTER}`}
              target='_blank'
              rel='noopener noreferrer'
              className='font-mono text-xs text-muted-foreground transition-colors hover:text-foreground'
            >
              {shorten(sub.plan.merchantWallet)}
            </a>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-xs text-muted-foreground'>Subscribed</span>
            <span className='text-xs text-muted-foreground'>
              {new Date(sub.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Renewal history */}
        {sub.renewals.length > 0 && (
          <div className='space-y-2'>
            <p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>Renewal history</p>
            <div className='space-y-1.5'>
              {sub.renewals.map((r) => (
                <div
                  key={r.id}
                  className='flex items-center gap-2 rounded-xl border border-border/40 bg-card px-3 py-2.5'
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${RENEWAL_DOT[r.status] ?? 'bg-muted-foreground'}`} />
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs font-medium text-foreground capitalize'>{r.status}</p>
                    <p className='text-[11px] text-muted-foreground'>
                      {r.executedAt
                        ? `Paid ${new Date(r.executedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : `Due ${new Date(r.dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </p>
                  </div>
                  {r.txSignature && (
                    <a
                      href={`https://solscan.io/tx/${r.txSignature}${SOLSCAN_CLUSTER}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
                    >
                      <ExternalLink className='h-3 w-3' />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancel */}
        {currentStatus === 'active' && (
          <CancelButton
            subscriptionId={sub.id}
            subscriberWallet={sub.subscriberWallet}
            onCancelled={() => setCancelled(true)}
          />
        )}

        {currentStatus === 'cancelled' && !cancelled && (
          <div className='flex items-center justify-center gap-2 rounded-xl border border-border/30 bg-muted/20 px-4 py-3 text-xs text-muted-foreground'>
            <CheckCircle className='h-3.5 w-3.5 text-muted-foreground' />
            This subscription has been cancelled.
          </div>
        )}

        {cancelled && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className='flex items-center justify-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-xs text-green-600 dark:text-green-400'
          >
            <CheckCircle className='h-3.5 w-3.5' />
            Subscription cancelled successfully.
          </motion.div>
        )}
      </motion.div>
    )
  })()

  return (
    <div className='flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12'>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className='w-full max-w-sm'
      >
        <div className='rounded-2xl border border-border/50 bg-card/80 p-6 shadow-2xl backdrop-blur-sm'>
          <div className='mb-6 flex flex-col items-center text-center'>
            <div className='mb-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1'>
              <p className='text-[10px] font-medium uppercase tracking-widest text-indigo-500 dark:text-indigo-400'>
                <RefreshCw className='mr-1 inline-block h-2.5 w-2.5' />
                Manage Subscription
              </p>
            </div>
            {sub?.plan.title && (
              <h1 className='mt-2 text-xl font-bold tracking-tight text-foreground'>{sub.plan.title}</h1>
            )}
            <div className='mx-auto mt-2 h-px w-48 bg-linear-to-r from-transparent via-border to-transparent' />
          </div>

          <AnimatePresence mode='wait'>{body}</AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
