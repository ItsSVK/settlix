'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { Plus, Loader2, X } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-context'

// USDC mainnet — currently the only allowed settlement token.
// To let merchants choose a token in the future, replace this with
// a <TokenSelector> component and remove the hardcoded constant.
const USDC_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

interface CreateLinkDialogProps {
  onCreated: () => void
}

export function CreateLinkDialog({ onCreated }: CreateLinkDialogProps) {
  const { wallet } = useAuth()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ id: string; payPath: string } | null>(null)

  const reset = () => {
    setAmount('')
    setError('')
    setResult(null)
    setOpen(false)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wallet) return
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/create-link', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: USDC_MAINNET, amount }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Failed to create link')
      }
      const data = await res.json()
      setResult(data)
      onCreated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const payUrl = result ? `${typeof window !== 'undefined' ? window.location.origin : ''}/pay/${result.id}` : ''

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className='flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]'
      >
        <Plus className='h-4 w-4' />
        Create Link
      </button>

      {open && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4'>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className='w-full max-w-sm rounded-2xl border border-border/50 bg-card p-6 shadow-2xl'
          >
            <div className='mb-5 flex items-center justify-between'>
              <h2 className='text-base font-bold text-foreground'>New Payment Link</h2>
              <button onClick={reset} className='rounded-lg p-1 text-muted-foreground hover:bg-muted'>
                <X className='h-4 w-4' />
              </button>
            </div>

            {result ? (
              <div className='space-y-4'>
                <p className='text-sm text-muted-foreground'>Your link is ready to share:</p>
                <div className='flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 p-3'>
                  <span className='flex-1 truncate font-mono text-xs text-foreground'>{payUrl}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(payUrl)}
                    className='rounded-lg border border-border/50 px-2 py-1 text-xs text-muted-foreground hover:bg-muted'
                  >
                    Copy
                  </button>
                </div>
                <button
                  onClick={reset}
                  className='w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90'
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className='space-y-4'>
                <div>
                  <label className='mb-1.5 block text-xs font-medium text-muted-foreground'>Settlement token</label>
                  {/* Token display — replace with <TokenSelector> when multi-token is ready */}
                  <div className='flex items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-3 py-2.5'>
                    <span className='text-sm font-semibold text-foreground'>USDC</span>
                    <span className='font-mono text-xs text-muted-foreground'>EPjFWdd5…TDt1v</span>
                  </div>
                </div>

                <div>
                  <label className='mb-1.5 block text-xs font-medium text-muted-foreground'>Amount (USDC)</label>
                  <input
                    type='number'
                    step='0.01'
                    min='0.01'
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder='10.00'
                    className='w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/30'
                  />
                </div>

                {error && <p className='text-xs text-destructive'>{error}</p>}

                <button
                  type='submit'
                  disabled={isLoading || !amount}
                  className='flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50'
                >
                  {isLoading && <Loader2 className='h-4 w-4 animate-spin' />}
                  {isLoading ? 'Creating…' : 'Create Link'}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </>
  )
}
