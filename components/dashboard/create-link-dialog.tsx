'use client'

import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, Loader2, X, Trash2, ChevronDown, AlertCircle, Check } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { copyText } from '@/lib/utils'
import { getDefaultUsdcMint } from '@/lib/solana/constants'

interface Partner {
  id: string
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
  const [partners, setPartners] = useState<Partner[]>([{ id: 'init', wallet: '', percent: '' }])

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState<{ id: string; payPath: string } | null>(null)

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const reset = () => {
    setAmount('')
    setTitle('')
    setDescription('')
    setDetailsOpen(false)
    setSplitEnabled(false)
    setPartners([{ id: Math.random().toString(36).substring(7), wallet: '', percent: '' }])
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
    if (partners.length < 9)
      setPartners((p) => [...p, { id: Math.random().toString(36).substring(7), wallet: '', percent: '' }])
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
        className='flex items-center rounded-xl bg-primary px-3 py-2 sm:px-4 sm:py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] shadow-sm'
      >
        <Plus className='h-4 w-4' />
        <span className='hidden sm:inline-block'>Create Link</span>
      </Button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <div className='fixed inset-0 z-100 overflow-y-auto'>
                <div className='flex min-h-full items-center justify-center p-4'>
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className='fixed inset-0 bg-background/80 backdrop-blur-md transition-opacity'
                  />
                  {/* Modal */}
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className='relative w-full max-w-lg rounded-3xl border border-border/40 bg-card/60 backdrop-blur-xl p-6 shadow-2xl outline-none ring-1 ring-white/5'
                  >
                    {/* Header */}
                    <div className='mb-6 flex items-center justify-between'>
                      <h2 className='text-lg font-semibold text-foreground tracking-tight'>New Payment</h2>
                      <Button
                        onClick={reset}
                        className='rounded-full p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all'
                        variant='ghost'
                      >
                        <X className='h-4 w-4' />
                      </Button>
                    </div>

                    {result ? (
                      /* ── Success state ── */
                      <div className='space-y-6'>
                        <div className='flex flex-col items-center justify-center py-6 border border-border/30 rounded-2xl bg-muted/10'>
                          <div className='h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mb-3'>
                            <Check className='h-6 w-6' />
                          </div>
                          <p className='text-sm font-medium text-foreground tracking-tight'>Your link is ready</p>
                          <p className='text-xs text-muted-foreground mt-1'>Share this URL with your customer</p>
                        </div>

                        <div className='flex items-center gap-2 rounded-2xl border border-border/50 bg-background/50 p-3 ring-1 ring-border/20'>
                          <span className='flex-1 truncate font-mono text-sm text-muted-foreground ml-2'>{payUrl}</span>
                          <Button
                            onClick={() => copyText(payUrl, setCopied)}
                            title='Copy pay URL'
                            variant='secondary'
                            size='sm'
                            className={`shrink-0 rounded-xl px-4 font-medium transition-all ${
                              copied ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : ''
                            }`}
                          >
                            {copied ? 'Copied!' : 'Copy'}
                          </Button>
                        </div>
                        <button
                          onClick={reset}
                          className='w-full rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all focus:ring-2 focus:ring-primary/20 outline-none'
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      /* ── Form ── */
                      <form onSubmit={submit} className='space-y-5' noValidate>
                        {/* Hero Amount Input */}
                        <div className='flex flex-col items-center justify-center py-6 px-4 rounded-3xl bg-muted/90 border border-border/30 transition-all focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10'>
                          <span className='text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2'>
                            Amount
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
                              className='w-[140px] bg-transparent text-5xl font-semibold text-foreground tracking-tighter outline-none placeholder:text-muted-foreground/30 text-center shrink-0'
                              style={{ WebkitAppearance: 'none', margin: 0, MozAppearance: 'textfield' }}
                            />
                          </div>
                          <div className='mt-4 flex items-center gap-1.5 rounded-full bg-background dark:bg-background/50 px-3 py-1 border border-border/40'>
                            <div className='h-3 w-3 rounded-full bg-blue-500/80' />
                            <span className='text-[11px] font-medium text-foreground'>Settled in USDC</span>
                          </div>
                        </div>

                        {/* Details Card */}
                        <div className='rounded-2xl border border-border/40 bg-background/30 overflow-hidden transition-all hover:bg-background/40'>
                          <button
                            type='button'
                            onClick={() => setDetailsOpen((v) => !v)}
                            className='flex w-full items-center justify-between px-4 py-3.5 text-left outline-none focus-visible:bg-muted/50'
                          >
                            <div>
                              <p className='text-sm font-medium text-foreground'>Details</p>
                              <p className='text-xs text-muted-foreground mt-0.5'>Add an optional title and note</p>
                            </div>
                            <motion.div
                              animate={{ rotate: detailsOpen ? 180 : 0 }}
                              transition={collapseTransition}
                              className='flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground'
                            >
                              <ChevronDown className='h-4 w-4' />
                            </motion.div>
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
                                <div className='border-t border-border/40 px-4 pb-4 pt-3 space-y-4'>
                                  <div>
                                    <input
                                      type='text'
                                      maxLength={80}
                                      value={title}
                                      onChange={(e) => setTitle(e.target.value)}
                                      placeholder='Title (e.g. Design invoice #12)'
                                      className='w-full rounded-xl border-none bg-muted/40 px-3.5 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/30 transition-all font-medium pt-3'
                                    />
                                  </div>
                                  <div>
                                    <textarea
                                      maxLength={300}
                                      rows={2}
                                      value={description}
                                      onChange={(e) => setDescription(e.target.value)}
                                      placeholder='What is this payment for?'
                                      className='w-full rounded-xl border-none bg-muted/40 px-3.5 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/30 transition-all resize-none'
                                    />
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Revenue Split Card */}
                        <div className='rounded-2xl border border-border/40 bg-background/30 overflow-hidden transition-all hover:bg-background/40'>
                          <div className='flex items-center justify-between px-4 py-3.5'>
                            <div>
                              <p className='text-sm font-medium text-foreground'>Revenue Split</p>
                              <p className='text-xs text-muted-foreground mt-0.5'>
                                Automatically route payouts to partners
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
                                <div className='border-t border-border/40 px-4 pb-4 pt-4 space-y-4'>
                                  {/* Distribution visualization */}
                                  <div className='flex items-center gap-3 w-full bg-muted/20 p-3 rounded-xl border border-border/30'>
                                    <div className='flex flex-col gap-1 items-start flex-1'>
                                      <span className='text-[10px] uppercase font-bold tracking-wider text-muted-foreground'>
                                        Your share
                                      </span>
                                      <span
                                        className={`text-sm font-bold ${
                                          merchantBp < 0 ? 'text-destructive' : 'text-foreground'
                                        }`}
                                      >
                                        {merchantBp < 0 ? '—' : `${merchantPercent}%`}
                                      </span>
                                    </div>
                                    <div className='h-8 w-px bg-border/50 shrink-0' />
                                    <div className='flex flex-col gap-1 items-end flex-1'>
                                      <span className='text-[10px] uppercase font-bold tracking-wider text-muted-foreground'>
                                        Partners
                                      </span>
                                      <span
                                        className={`text-sm font-bold ${
                                          allocationOk ? 'text-green-500' : 'text-amber-500'
                                        }`}
                                      >
                                        {(partnerBpTotal / 100).toFixed(2)}%
                                      </span>
                                    </div>
                                  </div>

                                  {/* Partners list */}
                                  <div className='flex flex-col'>
                                    <AnimatePresence initial={false}>
                                      {partners.map((p, i) => (
                                        <motion.div
                                          key={p.id}
                                          layout
                                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                          animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                          transition={{
                                            opacity: { duration: 0.2 },
                                            height: { duration: 0.3, ease: 'easeInOut' },
                                            marginTop: { duration: 0.3, ease: 'easeInOut' },
                                          }}
                                          className='flex flex-col gap-2 rounded-xl group relative overflow-hidden'
                                        >
                                          <div className='flex items-center gap-2'>
                                            <div className='relative flex-1'>
                                              <input
                                                type='text'
                                                value={p.wallet}
                                                onChange={(e) => updatePartner(i, 'wallet', e.target.value)}
                                                placeholder='Wallet address'
                                                className='w-full rounded-xl border border-border/30 bg-muted/30 px-3 py-2.5 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-border/60 focus:bg-muted/50 transition-all'
                                              />
                                            </div>
                                            <div className='relative w-[80px] shrink-0'>
                                              <input
                                                type='number'
                                                min='0.01'
                                                max='99.99'
                                                step='0.01'
                                                value={p.percent}
                                                onChange={(e) =>
                                                  updatePartner(i, 'percent', limitDecimals(e.target.value))
                                                }
                                                placeholder='0.0'
                                                className='w-full rounded-xl border border-border/30 bg-muted/30 py-2.5 pl-3 pr-6 text-xs font-semibold text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-border/60 focus:bg-muted/50 transition-all'
                                              />
                                              <span className='absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground pointer-events-none'>
                                                %
                                              </span>
                                            </div>
                                            <Button
                                              type='button'
                                              onClick={() => removePartner(i)}
                                              className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/5 text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-all'
                                            >
                                              <Trash2 className='h-4 w-4' />
                                            </Button>
                                          </div>
                                        </motion.div>
                                      ))}
                                    </AnimatePresence>
                                  </div>

                                  {partners.length < 9 && (
                                    <Button
                                      type='button'
                                      onClick={addPartner}
                                      className='flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-gray-300 hover:bg-gray-300 py-3 text-xs font-medium text-foreground transition-all dark:bg-gray-700 dark:text-gray-300'
                                    >
                                      <Plus className='h-3.5 w-3.5' />
                                      Add Partner
                                    </Button>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {error && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className='flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive'
                          >
                            <AlertCircle className='h-4 w-4 shrink-0 mt-0.5' />
                            <p className='font-medium'>{error}</p>
                          </motion.div>
                        )}

                        <Button
                          type='submit'
                          disabled={isLoading || !amount || parseFloat(amount) <= 0}
                          className='relative mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-background dark:text-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none'
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className='h-5 w-5 animate-spin' />
                              Creating...
                            </>
                          ) : (
                            'Create Payment Link'
                          )}
                        </Button>
                      </form>
                    )}
                  </motion.div>
                </div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  )
}
