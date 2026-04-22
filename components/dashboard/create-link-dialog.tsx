'use client'

import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, Loader2, X, Trash2, UserPlus, ChevronDown, AlertCircle } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { copyText } from '@/lib/utils'
import { getDefaultUsdcMint } from '@/lib/solana/constants'

interface Partner {
  wallet: string
  percent: string // human-readable, e.g. "30" or "15.5"
}

interface CreateLinkDialogProps {
  onCreated: () => void
}

function shorten(s: string, start = 6, end = 4) {
  return `${s.slice(0, start)}…${s.slice(-end)}`
}

/** Convert a percent string to basis points (integer). Returns NaN if invalid. */
function toBasisPoints(percent: string): number {
  const n = parseFloat(percent)
  if (!isFinite(n) || n <= 0) return NaN
  return Math.round(n * 100)
}

/** Restricts a numeric string to a maximum of 2 decimal places. */
function limitDecimals(val: string): string {
  if (!val.includes('.')) return val
  const [whole, decimal] = val.split('.')
  return decimal && decimal.length > 2 ? `${whole}.${decimal.slice(0, 2)}` : val
}

const INPUT =
  'w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors'

/** Framer Motion collapse animation — animates height + opacity on mount/unmount */
const collapseVariants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
} as const

const collapseTransition = { duration: 0.22, ease: 'easeInOut' } as const

export function CreateLinkDialog({ onCreated }: CreateLinkDialogProps) {
  const { wallet } = useAuth()

  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  // Optional fields open state
  const [detailsOpen, setDetailsOpen] = useState(false)

  // Split state
  const [splitEnabled, setSplitEnabled] = useState(false)
  const [partners, setPartners] = useState<Partner[]>([{ wallet: '', percent: '' }])

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState<{ id: string; payPath: string } | null>(null)

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const reset = () => {
    setAmount('')
    setTitle('')
    setDescription('')
    setDetailsOpen(false)
    setSplitEnabled(false)
    setPartners([{ wallet: '', percent: '' }])
    setError('')
    setResult(null)
    setOpen(false)
  }

  // ------------------------------------------------------------------
  // Split helpers
  // ------------------------------------------------------------------

  const partnerBpTotal = partners.reduce((sum, p) => {
    const bp = toBasisPoints(p.percent)
    return sum + (isNaN(bp) ? 0 : bp)
  }, 0)

  const merchantBp = 10000 - partnerBpTotal
  const merchantPercent = (merchantBp / 100).toFixed(2).replace(/\.?0+$/, '')

  const splitError = useCallback((): string | null => {
    if (!splitEnabled) return null
    for (const p of partners) {
      if (!p.wallet.trim()) return 'All partner wallet addresses are required.'
      if (p.wallet.trim().length < 32 || p.wallet.trim().length > 64)
        return `Invalid wallet: ${shorten(p.wallet.trim())}`
      const bp = toBasisPoints(p.percent)
      if (isNaN(bp) || bp <= 0) return 'All partner percentages must be greater than 0.'
      if (bp >= 10000) return 'Partner percentage must be less than 100.'
    }
    if (partnerBpTotal >= 10000) return 'Partner percentages must leave at least 0.01% for you.'
    return null
  }, [splitEnabled, partners, partnerBpTotal])

  const addPartner = () => {
    if (partners.length < 9) setPartners((p) => [...p, { wallet: '', percent: '' }])
    setError('')
  }

  const removePartner = (i: number) => {
    setPartners((p) => p.filter((_, idx) => idx !== i))
    setError('')
  }

  const updatePartner = (i: number, field: keyof Partner, value: string) => {
    setPartners((p) => p.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)))
    setError('')
  }

  // ------------------------------------------------------------------
  // Submit
  // ------------------------------------------------------------------

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wallet) return

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Amount must be greater than 0.')
      return
    }

    if (splitEnabled) {
      const err = splitError()
      if (err) {
        setError(err)
        return
      }
    }

    // console.log({
    //   token: getDefaultUsdcMint(),
    //   amount,
    //   title: title.trim() || undefined,
    //   description: description.trim() || undefined,
    //   recipients: splitEnabled
    //     ? partners.map((p) => ({
    //         wallet: p.wallet.trim(),
    //         basisPoints: toBasisPoints(p.percent),
    //       }))
    //     : undefined,
    // })

    setIsLoading(true)
    setError('')

    try {
      // Build recipients array: [merchant, ...partners] when split is enabled
      let recipients: { wallet: string; basisPoints: number }[] | undefined

      if (splitEnabled && partners.length > 0) {
        const partnerEntries = partners.map((p) => ({
          wallet: p.wallet.trim(),
          basisPoints: toBasisPoints(p.percent),
        }))
        recipients = [{ wallet: wallet, basisPoints: merchantBp }, ...partnerEntries]
      }

      const res = await fetch('/api/create-link', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: getDefaultUsdcMint(),
          amount,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          recipients,
        }),
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

  const allocationOk = Math.abs((partnerBpTotal + Math.max(merchantBp, 0)) / 100 - 100) < 0.001

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className='flex items-center rounded-xl bg-primary sm:px-4 sm:py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]'
      >
        <Plus className='h-4 w-4' />
        <span className='hidden sm:inline-block'>Create Link</span>
      </Button>

      {open &&
        mounted &&
        createPortal(
          <div className='fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4'>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className='w-full max-w-md rounded-2xl border border-border/50 bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto'
            >
              {/* Header */}
              <div className='mb-5 flex items-center justify-between'>
                <h2 className='text-base font-bold text-foreground'>New Payment Link</h2>
                <button
                  onClick={reset}
                  className='rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors'
                >
                  <X className='h-4 w-4' />
                </button>
              </div>

              {result ? (
                /* ── Success state ── */
                <div className='space-y-4'>
                  <p className='text-sm text-muted-foreground'>Your link is ready to share:</p>
                  <div className='flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 p-3'>
                    <span className='flex-1 truncate font-mono text-xs text-foreground'>{payUrl}</span>
                    <Button
                      onClick={() => copyText(payUrl, setCopied)}
                      title='Copy pay URL'
                      variant='ghost'
                      size='xs'
                      className={`shrink-0 rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted ${
                        copied ? 'bg-muted' : ''
                      }`}
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <button
                    onClick={reset}
                    className='w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity'
                  >
                    Done
                  </button>
                </div>
              ) : (
                /* ── Form ── */
                <form onSubmit={submit} className='space-y-3' noValidate>
                  {/* Settlement token — read-only label */}
                  <div className='flex items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-3 py-2.5'>
                    <span className='text-xs text-muted-foreground'>Settled in</span>
                    <span className='text-sm font-semibold text-foreground'>USDC</span>
                    <span className='font-mono text-[10px] text-muted-foreground/60'>EPjFWdd5…TDt1v</span>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className='mb-1.5 block text-xs font-medium text-muted-foreground'>Amount (USDC)</label>
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
                      placeholder='10.00'
                      className={INPUT}
                    />
                  </div>

                  {/* ── Details (collapsible optional) ── */}
                  <div className='rounded-xl border border-border/50 overflow-hidden'>
                    <button
                      type='button'
                      onClick={() => setDetailsOpen((v) => !v)}
                      className='flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-muted/30 transition-colors'
                    >
                      <div>
                        <p className='text-xs font-semibold text-foreground'>Details</p>
                        <p className='text-[10px] text-muted-foreground mt-0.5'>Add a title or note to this link</p>
                      </div>
                      <motion.span
                        animate={{ rotate: detailsOpen ? 180 : 0 }}
                        transition={collapseTransition}
                        className='text-muted-foreground/50 shrink-0 ml-3'
                      >
                        <ChevronDown className='h-3.5 w-3.5' />
                      </motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {detailsOpen && (
                        <motion.div
                          key='details-body'
                          variants={collapseVariants}
                          initial='initial'
                          animate='animate'
                          exit='exit'
                          transition={collapseTransition}
                          className='overflow-hidden'
                        >
                          <div className='border-t border-border/40 px-3 pb-3 pt-3 space-y-3'>
                            <div>
                              <label className='mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground'>
                                Title
                              </label>
                              <input
                                type='text'
                                maxLength={80}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder='e.g. Design invoice #12'
                                className={INPUT}
                              />
                            </div>
                            <div>
                              <label className='mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground'>
                                Note
                              </label>
                              <textarea
                                maxLength={300}
                                rows={2}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder='What is this payment for?'
                                className={`${INPUT} resize-none`}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ── Revenue Split ── */}
                  <div className='rounded-xl border border-border/50 overflow-hidden'>
                    {/* Toggle header */}
                    <div className='flex items-center justify-between px-3 py-2.5'>
                      <div>
                        <p className='text-xs font-semibold text-foreground'>Revenue Split</p>
                        <p className='text-[10px] text-muted-foreground mt-0.5'>
                          Share payouts with partners automatically
                        </p>
                      </div>
                      <Switch
                        id='split-toggle'
                        checked={splitEnabled}
                        onCheckedChange={(checked) => {
                          setSplitEnabled(checked)
                          setError('')
                        }}
                        className='cursor-pointer [&>span]:rounded-full'
                      />
                    </div>

                    {/* Collapsible split body */}
                    <AnimatePresence initial={false}>
                      {splitEnabled && (
                        <motion.div
                          key='split-body'
                          variants={collapseVariants}
                          initial='initial'
                          animate='animate'
                          exit='exit'
                          transition={collapseTransition}
                          className='overflow-hidden'
                        >
                          <div className='border-t border-border/40 px-3 pb-3 pt-3 space-y-3'>
                            {/* Your share (read-only) */}
                            <div>
                              <p className='mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground'>
                                Your share
                              </p>
                              <div className='flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-3 py-2'>
                                <span className='font-mono text-xs text-muted-foreground truncate max-w-[60%]'>
                                  {wallet ? shorten(wallet, 8, 6) : '—'}
                                </span>
                                <span
                                  className={`text-sm font-bold tabular-nums ${
                                    merchantBp < 0 ? 'text-destructive' : 'text-foreground'
                                  }`}
                                >
                                  {merchantBp < 0 ? '—' : `${merchantPercent}%`}
                                </span>
                              </div>
                            </div>

                            {/* Partner rows */}
                            {partners.length > 0 && (
                              <div>
                                <p className='mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground'>
                                  Partners
                                </p>
                                <div className='space-y-2'>
                                  {partners.map((p, i) => (
                                    <div
                                      key={i}
                                      className='rounded-xl border border-border/40 bg-muted/10 p-2.5 space-y-2'
                                    >
                                      <input
                                        type='text'
                                        value={p.wallet}
                                        onChange={(e) => updatePartner(i, 'wallet', e.target.value)}
                                        placeholder='Wallet address'
                                        className='w-full rounded-lg border border-border/40 bg-background/60 px-2.5 py-2 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors'
                                      />
                                      <div className='flex items-center gap-2'>
                                        <div className='relative flex-1'>
                                          <input
                                            type='number'
                                            min='0.01'
                                            max='99.99'
                                            step='0.01'
                                            value={p.percent}
                                            onChange={(e) => updatePartner(i, 'percent', limitDecimals(e.target.value))}
                                            placeholder='0.00'
                                            className='w-full rounded-lg border border-border/40 bg-background/60 py-2 pl-2.5 pr-7 text-xs text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors'
                                          />
                                          <span className='absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none'>
                                            %
                                          </span>
                                        </div>
                                        <button
                                          type='button'
                                          onClick={() => removePartner(i)}
                                          className='shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors'
                                        >
                                          <Trash2 className='h-3.5 w-3.5' />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {partners.length < 9 && (
                              <button
                                type='button'
                                onClick={addPartner}
                                className='flex items-center gap-1.5 text-xs text-primary hover:opacity-75 transition-opacity'
                              >
                                <UserPlus className='h-3.5 w-3.5' />
                                Add partner
                              </button>
                            )}

                            {/* Allocation summary */}
                            <div className='flex items-center justify-between pt-1 border-t border-border/30'>
                              <span className='text-[10px] text-muted-foreground'>Total allocated</span>
                              <span
                                className={`text-[11px] font-semibold tabular-nums ${
                                  allocationOk ? 'text-green-500' : 'text-amber-500'
                                }`}
                              >
                                {((partnerBpTotal + Math.max(merchantBp, 0)) / 100).toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {error && (
                    <div className='flex items-start gap-2 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive'>
                      <AlertCircle className='h-4 w-4 shrink-0 mt-0.5' />
                      <p>{error}</p>
                    </div>
                  )}

                  <button
                    type='submit'
                    disabled={isLoading || !amount}
                    className='flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none'
                  >
                    {isLoading && <Loader2 className='h-4 w-4 animate-spin' />}
                    {isLoading ? 'Creating…' : 'Create Link'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>,
          document.body,
        )}
    </>
  )
}
