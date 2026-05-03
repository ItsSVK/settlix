'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, Loader2, Trash2 } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { FormErrorBanner } from '@/components/ui/form-error'
import { DialogShell } from '@/components/shared/dialog-shell'
import { DialogSuccess } from '@/components/shared/dialog-success'
import { getDefaultUsdcMint } from '@/lib/solana/constants'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import { apiClient } from '@/lib/api/client'
import { useLinks } from '@/lib/hooks/use-links'

interface Partner {
  id: string
  wallet: string
  percent: string
}

function shorten(s: string, start = 6, end = 4) {
  return `${s.slice(0, start)}…${s.slice(-end)}`
}

function toBasisPoints(percent: string): number {
  const n = parseFloat(percent)
  if (!isFinite(n) || n <= 0) return NaN
  return Math.round(n * 100)
}

function limitDecimals(val: string): string {
  if (!val.includes('.')) return val
  const [whole, decimal] = val.split('.')
  return decimal && decimal.length > 2 ? `${whole}.${decimal.slice(0, 2)}` : val
}

const collapseVariants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
} as const

const collapseTransition = { duration: 0.22, ease: 'easeInOut' } as const

export function CreateLinkDialog() {
  const { wallet } = useAuth()

  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [limitsEnabled, setLimitsEnabled] = useState(false)
  const [expiresAt, setExpiresAt] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [splitEnabled, setSplitEnabled] = useState(false)
  const [partners, setPartners] = useState<Partner[]>([{ id: 'init', wallet: '', percent: '' }])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ id: string; payPath: string } | null>(null)
  const { refresh } = useLinks()

  const reset = () => {
    const wasCreated = !!result
    setAmount('')
    setTitle('')
    setDescription('')
    setLimitsEnabled(false)
    setExpiresAt('')
    setMaxUses('')
    setSplitEnabled(false)
    setPartners([{ id: Math.random().toString(36).substring(7), wallet: '', percent: '' }])
    setError('')
    setResult(null)
    setOpen(false)

    if (wasCreated) {
      setTimeout(() => refresh(), 300)
    }
  }

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

    setIsLoading(true)
    setError('')

    try {
      let recipients: { wallet: string; basisPoints: number }[] | undefined

      if (splitEnabled && partners.length > 0) {
        const partnerEntries = partners.map((p) => ({
          wallet: p.wallet.trim(),
          basisPoints: toBasisPoints(p.percent),
        }))
        recipients = [{ wallet: wallet, basisPoints: merchantBp }, ...partnerEntries]
      }

      const data = await apiClient.post<{ id: string; payPath: string }>('/api/links', {
        token: getDefaultUsdcMint(),
        amount,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        recipients,
        expiresAt: limitsEnabled && expiresAt ? expiresAt : undefined,
        maxUses: limitsEnabled && maxUses ? parseInt(maxUses, 10) : undefined,
      })
      setResult(data)
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

      <DialogShell open={open} onClose={reset} title='New Payment Link' align='top'>
        {result ? (
          <DialogSuccess
            title='Your link is ready'
            subtitle='Share this URL with your customer'
            url={payUrl}
            onDone={reset}
          />
        ) : (
          <form onSubmit={submit} className='space-y-5' noValidate>
            <div className='flex flex-col items-center justify-center rounded-3xl border border-border/30 bg-muted/90 px-4 pt-4 pb-6 transition-all focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10'>
              <span className='mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground'>Amount</span>
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
              <div className='mt-4 flex items-center gap-1.5 rounded-full border border-border/40 bg-background px-3 py-1 dark:bg-background/50'>
                <div className='h-3 w-3 rounded-full bg-blue-500/80' />
                <span className='text-[11px] font-medium text-foreground'>Settled in USDC</span>
              </div>
            </div>

            {/* Details section */}
            <div className='space-y-3'>
              <input
                type='text'
                maxLength={80}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='Link title (optional)'
                className='w-full rounded-2xl border border-border/40 bg-background/30 px-4 py-3.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/30 hover:bg-background/40'
              />
              <textarea
                maxLength={300}
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='Add a description or note (optional)'
                className='w-full resize-none rounded-2xl border border-border/40 bg-background/30 px-4 py-3.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/30 hover:bg-background/40'
              />
            </div>

            {/* Limits + Revenue Split */}
            <div className='space-y-5'>
              {/* Limits section */}
              <div className='overflow-hidden rounded-2xl border border-border/40 bg-background/30 transition-all hover:bg-background/40'>
                <div className='flex items-center justify-between px-4 py-3.5'>
                  <div>
                    <p className='text-sm font-medium text-foreground'>Payment Limits</p>
                    <p className='mt-0.5 text-xs text-muted-foreground'>
                      {limitsEnabled
                        ? [expiresAt && 'Expiry set', maxUses && `Max ${maxUses} uses`].filter(Boolean).join(' · ') ||
                          'Set expiry or max uses'
                        : 'Restrict link usage and expiry'}
                    </p>
                  </div>
                  <Switch
                    checked={limitsEnabled}
                    onCheckedChange={(checked) => {
                      setLimitsEnabled(checked)
                      setError('')
                    }}
                    className='cursor-pointer [&>span]:w-4! data-[state=checked]:[&>span]:translate-x-6!'
                  />
                </div>
                <AnimatePresence initial={false}>
                  {limitsEnabled && (
                    <motion.div
                      key='limits-body'
                      variants={collapseVariants}
                      initial='initial'
                      animate='animate'
                      exit='exit'
                      transition={collapseTransition}
                      className='overflow-hidden'
                    >
                      <div className='space-y-4 border-t border-border/40 px-4 pb-4 pt-4'>
                        <DatePickerInput
                          label='Expires at'
                          value={expiresAt}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={setExpiresAt}
                        />
                        <div>
                          <label className='mb-1.5 block text-xs font-medium text-muted-foreground'>Max uses</label>
                          <input
                            type='number'
                            min='1'
                            step='1'
                            value={maxUses}
                            onChange={(e) => setMaxUses(e.target.value)}
                            placeholder='Unlimited'
                            className='w-full rounded-xl border-none bg-muted/90 px-3.5 py-3 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/30'
                            style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Revenue split section */}
              <div className='overflow-hidden rounded-2xl border border-border/40 bg-background/30 transition-all hover:bg-background/40'>
                <div className='flex items-center justify-between px-4 py-3.5'>
                  <div>
                    <p className='text-sm font-medium text-foreground'>Revenue Split</p>
                    <p className='mt-0.5 text-xs text-muted-foreground'>Route payments to partners</p>
                  </div>
                  <Switch
                    id='split-toggle'
                    checked={splitEnabled}
                    onCheckedChange={(checked) => {
                      setSplitEnabled(checked)
                      setError('')
                    }}
                    className='cursor-pointer [&>span]:w-4! data-[state=checked]:[&>span]:translate-x-6!'
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
                      <div className='space-y-4 border-t border-border/40 px-4 pb-4 pt-4'>
                        <div className='flex w-full items-center gap-3 rounded-xl border border-border/30 bg-muted/20 p-3'>
                          <div className='flex flex-1 flex-col items-start gap-1'>
                            <span className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                              Your share
                            </span>
                            <span
                              className={`text-sm font-bold ${merchantBp < 0 ? 'text-destructive' : 'text-foreground'}`}
                            >
                              {merchantBp < 0 ? '—' : `${merchantPercent}%`}
                            </span>
                          </div>
                          <div className='h-8 w-px shrink-0 bg-border/50' />
                          <div className='flex flex-1 flex-col items-end gap-1'>
                            <span className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                              Partners
                            </span>
                            <span className={`text-sm font-bold ${allocationOk ? 'text-green-500' : 'text-amber-500'}`}>
                              {(partnerBpTotal / 100).toFixed(2)}%
                            </span>
                          </div>
                        </div>

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
                                className='group relative flex flex-col gap-2 overflow-hidden rounded-xl'
                              >
                                <div className='flex items-center gap-2'>
                                  <div className='relative flex-1'>
                                    <input
                                      type='text'
                                      value={p.wallet}
                                      onChange={(e) => updatePartner(i, 'wallet', e.target.value)}
                                      placeholder='Wallet address'
                                      className='w-full rounded-xl border border-border/30 bg-muted/90 px-3 py-2.5 font-mono text-xs text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-border/60'
                                    />
                                  </div>
                                  <div className='relative w-[80px] shrink-0'>
                                    <input
                                      type='number'
                                      min='0.01'
                                      max='99.99'
                                      step='0.01'
                                      value={p.percent}
                                      onChange={(e) => updatePartner(i, 'percent', limitDecimals(e.target.value))}
                                      placeholder='0.0'
                                      className='w-full rounded-xl border border-border/30 bg-muted/90 py-2.5 pl-3 pr-6 text-xs font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-border/60'
                                    />
                                    <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground'>
                                      %
                                    </span>
                                  </div>
                                  <Button
                                    type='button'
                                    onClick={() => removePartner(i)}
                                    className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/5 text-destructive/70 transition-all hover:bg-destructive/10 hover:text-destructive'
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
                            className='flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-gray-300 py-3 text-xs font-medium text-foreground transition-all hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
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
            </div>

            <FormErrorBanner error={error} />

            <Button
              type='submit'
              disabled={isLoading || !amount || parseFloat(amount) <= 0}
              className='relative mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-background transition-all hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:text-foreground'
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
      </DialogShell>
    </>
  )
}
