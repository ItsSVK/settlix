'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormErrorBanner } from '@/components/ui/form-error'
import { DialogShell } from '@/components/shared/dialog-shell'
import { DialogSuccess } from '@/components/shared/dialog-success'
import { getDefaultUsdcMint } from '@/lib/solana/constants'
import { apiClient } from '@/lib/api/client'
import { useSubscriptions } from '@/lib/hooks/use-subscriptions'

function limitDecimals(val: string): string {
  if (!val.includes('.')) return val
  const [whole, decimal] = val.split('.')
  return decimal && decimal.length > 2 ? `${whole}.${decimal.slice(0, 2)}` : val
}

export function CreateSubscriptionDialog() {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [interval, setInterval] = useState<'daily' | 'weekly'>('weekly')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ id: string; payPath: string } | null>(null)
  const { refresh } = useSubscriptions()

  const reset = () => {
    const wasCreated = !!result
    setAmount('')
    setInterval('weekly')
    setTitle('')
    setDescription('')
    setError('')
    setResult(null)
    setOpen(false)
    if (wasCreated) setTimeout(() => refresh(), 300)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Amount must be greater than 0.')
      return
    }

    if (!title.trim()) {
      setError('Plan name is required.')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const data = await apiClient.post<{ id: string; payPath: string }>('/api/subscription-plans', {
        token: getDefaultUsdcMint(),
        amount,
        interval,
        title: title.trim(),
        description: description.trim() || undefined,
      })
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const subscribeUrl = result
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/subscribe/${result.id}`
    : ''

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className='flex items-center rounded-xl bg-primary px-3 py-2 sm:px-4 sm:py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] shadow-sm'
      >
        <Plus className='h-4 w-4' />
        <span className='hidden sm:inline-block'>Create Plan</span>
      </Button>

      <DialogShell open={open} onClose={reset} title='New Subscription Plan' align='top'>
        {result ? (
          <DialogSuccess
            title='Your plan is ready'
            subtitle='Share this link with subscribers'
            url={subscribeUrl}
            onDone={reset}
          />
        ) : (
          <form onSubmit={submit} className='space-y-5' noValidate>
            {/* Amount + interval card */}
            <div className='flex flex-col items-center justify-center rounded-3xl border border-border/30 bg-muted/90 px-4 pt-4 pb-6 transition-all focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10'>
              <span className='mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                Amount per {interval === 'daily' ? 'day' : 'week'}
              </span>
              <div className='flex items-center justify-center gap-2'>
                <span className='text-3xl font-medium text-muted-foreground/50'>$</span>
                <input
                  type='number'
                  step='0.01'
                  min='0.01'
                  required
                  value={amount}
                  onChange={(e) => {
                    setAmount(limitDecimals(e.target.value))
                    setError('')
                  }}
                  placeholder='0.00'
                  className='w-[140px] shrink-0 bg-transparent text-center text-5xl font-semibold tracking-tighter text-foreground outline-none placeholder:text-muted-foreground/30'
                  style={{ WebkitAppearance: 'none', margin: 0, MozAppearance: 'textfield' }}
                />
              </div>

              {/* Interval selector */}
              <AnimatePresence initial={false}>
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                  className='flex items-center gap-1.5 rounded-xl border border-border/40 bg-background px-1 py-1'
                >
                  {(['daily', 'weekly'] as const).map((opt) => (
                    <button
                      key={opt}
                      type='button'
                      onClick={() => setInterval(opt)}
                      className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        interval === opt ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {opt === 'daily' ? 'Daily' : 'Weekly'}
                    </button>
                  ))}
                </motion.div>
              </AnimatePresence>

              <div className='mt-4 flex items-center gap-1.5 rounded-full border border-border/40 bg-background px-3 py-1 dark:bg-background/50'>
                <div className='h-3 w-3 rounded-full bg-blue-500/80' />
                <span className='text-[11px] font-medium text-foreground'>Settled in USDC</span>
              </div>

              <p className='mt-4 text-[10px] text-muted-foreground/70 text-center max-w-[250px]'>
                Subscribers authorize up to 12 payments at once. They can cancel anytime.
              </p>
            </div>

            {/* Details */}
            <div className='space-y-3'>
              <div className='relative'>
                <RefreshCw className='pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50' />
                <input
                  type='text'
                  maxLength={70}
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder='Plan name'
                  className='w-full rounded-2xl border border-border/40 bg-background/30 py-3.5 pl-9 pr-4 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/30 hover:bg-background/40'
                />
              </div>
              <textarea
                maxLength={300}
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='Describe what subscribers get (optional)'
                className='w-full resize-none rounded-2xl border border-border/40 bg-background/30 px-4 py-3.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/30 hover:bg-background/40'
              />
            </div>

            <FormErrorBanner error={error} />

            <Button
              type='submit'
              disabled={isLoading || !amount || parseFloat(amount) <= 0 || !title.trim()}
              className='relative mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-background transition-all hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:text-primary-foreground'
            >
              {isLoading ? (
                <>
                  <Loader2 className='h-5 w-5 animate-spin' />
                  Creating...
                </>
              ) : (
                'Create Subscription Plan'
              )}
            </Button>
          </form>
        )}
      </DialogShell>
    </>
  )
}
