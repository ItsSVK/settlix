'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormErrorBanner } from '@/components/ui/form-error'
import { DialogShell } from '@/components/shared/dialog-shell'
import { DialogSuccess } from '@/components/shared/dialog-success'
import { getDefaultUsdcMint } from '@/lib/solana/constants'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import { apiClient } from '@/lib/api/client'

interface LineItem {
  id: string
  description: string
  quantity: string
  unitPrice: string
}

interface CreateInvoiceDialogProps {
  onCreated: () => void
}

function newItem(): LineItem {
  return { id: Math.random().toString(36).slice(2), description: '', quantity: '1', unitPrice: '' }
}

function rowTotal(item: LineItem): number {
  const q = parseFloat(item.quantity)
  const p = parseFloat(item.unitPrice)
  return isNaN(q) || isNaN(p) ? 0 : q * p
}

function invoiceTotal(items: LineItem[]): number {
  return items.reduce((acc, item) => acc + rowTotal(item), 0)
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function CreateInvoiceDialog({ onCreated }: CreateInvoiceDialogProps) {
  const [open, setOpen] = useState(false)

  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [memo, setMemo] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([newItem()])

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ id: string; invoicePath: string } | null>(null)

  const reset = () => {
    setClientName('')
    setClientEmail('')
    setDueDate('')
    setMemo('')
    setLineItems([newItem()])
    setError('')
    setResult(null)
    setOpen(false)
  }

  const updateItem = (id: string, field: keyof Omit<LineItem, 'id'>, value: string) => {
    setLineItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
    setError('')
  }

  const addItem = () => setLineItems((prev) => [...prev, newItem()])

  const removeItem = (id: string) => {
    if (lineItems.length > 1) setLineItems((prev) => prev.filter((item) => item.id !== id))
  }

  const total = invoiceTotal(lineItems)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()

    for (const item of lineItems) {
      if (!item.description.trim()) {
        setError('All line items need a description.')
        return
      }
      const q = parseFloat(item.quantity)
      const p = parseFloat(item.unitPrice)
      if (isNaN(q) || q <= 0) {
        setError('All quantities must be greater than 0.')
        return
      }
      if (isNaN(p) || p <= 0) {
        setError('All unit prices must be greater than 0.')
        return
      }
    }

    if (total <= 0) {
      setError('Invoice total must be greater than 0.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const data = await apiClient.post<{ id: string; invoicePath: string }>('/api/invoices', {
        token: getDefaultUsdcMint(),
        clientName: clientName.trim() || undefined,
        clientEmail: clientEmail.trim() || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        memo: memo.trim() || undefined,
        lineItems: lineItems.map((item) => ({
          description: item.description.trim(),
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
        })),
      })
      setResult(data)
      onCreated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const invoiceUrl = result
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invoice/${result.id}`
    : ''

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className='flex items-center rounded-xl bg-primary px-3 py-2 sm:px-4 sm:py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] shadow-sm'
      >
        <Plus className='h-4 w-4' />
        <span className='hidden sm:inline-block'>Create Invoice</span>
      </Button>

      <DialogShell open={open} onClose={reset} title='New Invoice' maxWidth='xl' align='top'>
        {result ? (
          <DialogSuccess
            title='Invoice created'
            subtitle='Share this link with your client'
            url={invoiceUrl}
            onDone={reset}
          />
        ) : (
          <form onSubmit={(e) => void submit(e)} className='space-y-5' noValidate>
            {/* Client info */}
            <div className='overflow-hidden rounded-2xl border border-border/40 bg-background/30 transition-all'>
              <div className='px-4 py-3.5'>
                <p className='text-sm font-medium text-foreground'>Client</p>
                <p className='mt-0.5 text-xs text-muted-foreground'>Add client details (optional)</p>
              </div>
              <div className='space-y-4 border-t border-border/40 px-4 pb-4 pt-4'>
                <div>
                  <input
                    type='text'
                    value={clientName}
                    onChange={(e) => { setClientName(e.target.value); setError('') }}
                    placeholder='Client name'
                    maxLength={100}
                    className='w-full rounded-xl border-none bg-muted/90 px-3.5 py-3 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/30'
                  />
                </div>
                <div>
                  <input
                    type='email'
                    value={clientEmail}
                    onChange={(e) => { setClientEmail(e.target.value); setError('') }}
                    placeholder='Email address'
                    className='w-full rounded-xl border-none bg-muted/90 px-3.5 py-3 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/30'
                  />
                </div>
                <DatePickerInput
                  label='Due date'
                  type='date'
                  value={dueDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(v) => { setDueDate(v); setError('') }}
                />
              </div>
            </div>

            {/* Line items */}
            <div className='overflow-hidden rounded-2xl border border-border/40 bg-background/30 transition-all'>
              <div className='px-4 py-3.5'>
                <p className='text-sm font-medium text-foreground'>Line Items</p>
                <p className='mt-0.5 text-xs text-muted-foreground'>Add items to your invoice</p>
              </div>

              <div className='space-y-3 border-t border-border/40 px-4 pb-4 pt-4'>
                <div className='space-y-2'>
                  <AnimatePresence initial={false}>
                    {lineItems.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className='overflow-hidden'
                      >
                        <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                          <div className='relative w-full min-w-0 sm:flex-1'>
                            <input
                              type='text'
                              value={item.description}
                              onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                              placeholder='Description'
                              maxLength={200}
                              className='w-full rounded-xl border-none bg-muted/90 px-3 py-3 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/30'
                            />
                          </div>
                          <div className='flex w-full shrink-0 items-center gap-2 sm:w-auto'>
                            <div className='relative w-20 shrink-0 sm:w-16'>
                              <input
                                type='number'
                                value={item.quantity}
                                min='0.0001'
                                step='any'
                                onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                                placeholder='Qty'
                                className='w-full rounded-xl border-none bg-muted/90 px-2 py-3 text-center text-sm font-medium text-foreground outline-none transition-all focus:ring-1 focus:ring-primary/30'
                                style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                              />
                            </div>
                            <div className='relative flex-1 sm:w-32 sm:flex-none'>
                              <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground'>
                                $
                              </span>
                              <input
                                type='number'
                                value={item.unitPrice}
                                min='0.000001'
                                step='any'
                                onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                                placeholder='0.00'
                                className='w-full rounded-xl border-none bg-muted/90 py-3 pl-7 pr-3 text-sm font-medium text-foreground outline-none transition-all focus:ring-1 focus:ring-primary/30'
                                style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                              />
                            </div>
                            <span className='w-20 shrink-0 truncate text-right font-mono text-xs font-medium text-muted-foreground'>
                              {fmt(rowTotal(item))}
                            </span>
                            <Button
                              type='button'
                              onClick={() => removeItem(item.id)}
                              disabled={lineItems.length === 1}
                              variant='ghost'
                              className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/5 text-destructive/70 transition-all hover:bg-destructive/10 hover:text-destructive disabled:opacity-30 sm:h-9 sm:w-9'
                            >
                              <Trash2 className='h-4 w-4 sm:h-3.5 sm:w-3.5' />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <Button
                  type='button'
                  onClick={addItem}
                  disabled={lineItems.length >= 50}
                  className='flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-gray-300 py-3 text-xs font-medium text-foreground transition-all hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
                >
                  <Plus className='h-3.5 w-3.5' /> Add Line Item
                </Button>

                <div className='flex items-center justify-between border-t border-border/30 pt-4 mt-2'>
                  <span className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Total</span>
                  <span className='font-mono text-sm font-bold text-foreground'>
                    {fmt(total)} <span className='text-xs font-normal text-muted-foreground'>USDC</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Memo */}
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder='Add a note or memo (optional)'
              maxLength={1000}
              rows={2}
              className='w-full resize-none rounded-2xl border border-border/40 bg-background/30 px-4 py-3.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/30 hover:bg-background/40'
            />

            <FormErrorBanner error={error} />

            <Button
              type='submit'
              disabled={isLoading || lineItems.length === 0 || total <= 0}
              className='relative mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-background transition-all hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:text-foreground'
            >
              {isLoading ? (
                <>
                  <Loader2 className='h-5 w-5 animate-spin' />
                  Creating...
                </>
              ) : (
                `Create Invoice · ${fmt(total)} USDC`
              )}
            </Button>
          </form>
        )}
      </DialogShell>
    </>
  )
}
