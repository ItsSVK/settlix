'use client'

import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSubscriptionFlow, SUBSCRIBE_STEP_LABELS, type SubscribeResult } from '@/lib/hooks/use-subscription-flow'

interface SubscribeButtonProps {
  planId: string
  onSuccess: (result: SubscribeResult) => void
  meta?: { subscriberName?: string; subscriberEmail?: string }
  className?: string
}

export function SubscribeButton({ planId, onSuccess, meta, className }: SubscribeButtonProps) {
  const { step, errorMsg, isLoading, connected, requestWalletConnection, subscribe } = useSubscriptionFlow({
    onSuccess,
  })

  if (!connected) {
    return (
      <button
        onClick={requestWalletConnection}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 py-3.5 text-sm font-semibold text-primary transition-all hover:border-primary hover:bg-primary/5',
          className,
        )}
      >
        Connect Wallet to Subscribe
      </button>
    )
  }

  return (
    <div className='space-y-2'>
      <button
        onClick={() => subscribe(planId, meta)}
        disabled={isLoading || step === 'done'}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground',
          'transition-all duration-200 hover:opacity-90 active:scale-[0.98]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          step === 'error' && 'bg-destructive',
          step === 'done' && 'bg-green-600',
          className,
        )}
      >
        {isLoading && <Loader2 className='h-4 w-4 animate-spin' />}
        {step === 'idle' && <RefreshCw className='h-4 w-4' />}
        {SUBSCRIBE_STEP_LABELS[step]}
      </button>

      <AnimatePresence>
        {step === 'error' && errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className='flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2.5'
          >
            <AlertCircle className='mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive' />
            <p className='text-xs leading-relaxed text-destructive/90'>{errorMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
