'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { FileText, ExternalLink, CheckCircle2, Clock, AlertTriangle, Loader2 } from 'lucide-react'
import { CreateInvoiceDialog } from '@/components/dashboard/create-invoice-dialog'

interface InvoiceItem {
  id: string
  description: string
  quantity: string
  unitPrice: string
}

interface Invoice {
  id: string
  clientName: string | null
  clientEmail: string | null
  dueDate: string | null
  memo: string | null
  token: string
  amount: string
  linkId: string
  status: 'paid' | 'overdue' | 'unpaid'
  paidAt: string | null
  txSignature: string | null
  createdAt: string
  lineItems: InvoiceItem[]
}

function fmt(n: string) {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function StatusBadge({ status }: { status: Invoice['status'] }) {
  if (status === 'paid') {
    return (
      <span className='flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-[11px] font-bold text-green-500 ring-1 ring-green-500/20'>
        <CheckCircle2 className='h-3 w-3' /> Paid
      </span>
    )
  }
  if (status === 'overdue') {
    return (
      <span className='flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-[11px] font-bold text-destructive ring-1 ring-destructive/20'>
        <AlertTriangle className='h-3 w-3' /> Overdue
      </span>
    )
  }
  return (
    <span className='flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-500 ring-1 ring-amber-500/20'>
      <Clock className='h-3 w-3' /> Unpaid
    </span>
  )
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const invoiceUrl = `/invoice/${invoice.id}`

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className='flex items-center gap-3 rounded-2xl border border-border/40 bg-card/40 px-4 py-3.5 backdrop-blur-sm transition-colors hover:bg-card/60'
    >
      <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted/60'>
        <FileText className='h-3.5 w-3.5 text-muted-foreground' />
      </div>

      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-2'>
          <p className='truncate text-sm font-medium text-foreground'>
            {invoice.clientName ?? <span className='text-muted-foreground italic'>No client name</span>}
          </p>
          <StatusBadge status={invoice.status} />
        </div>
        <div className='mt-0.5 flex items-center gap-2 text-xs text-muted-foreground'>
          {invoice.clientEmail && <span className='truncate max-w-[180px]'>{invoice.clientEmail}</span>}
          {invoice.dueDate && (
            <>
              {invoice.clientEmail && <span>·</span>}
              <span>
                Due {new Date(invoice.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </>
          )}
          <span>{invoice.clientEmail || invoice.dueDate ? '·' : ''}</span>
          <span className='font-mono text-muted-foreground/80'>
            {new Date(invoice.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      <div className='flex items-center gap-3'>
        <span className='font-mono text-sm font-semibold text-foreground'>
          {fmt(invoice.amount)} <span className='text-xs font-normal text-muted-foreground'>USDC</span>
        </span>
        <a
          href={invoiceUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground'
          title='View invoice'
        >
          <ExternalLink className='h-3.5 w-3.5' />
        </a>
      </div>
    </motion.div>
  )
}

function EmptyState() {
  return (
    <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/10 py-12'>
      <div className='mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60'>
        <FileText className='h-5 w-5 text-muted-foreground' />
      </div>
      <p className='text-sm font-medium text-muted-foreground'>No invoices yet</p>
      <p className='mt-1 text-xs text-muted-foreground/60'>Create an invoice to bill your clients in USDC</p>
    </div>
  )
}

export function InvoiceSection() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/invoice', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json() as { invoices: Invoice[] }
      setInvoices(data.invoices)
    } catch {
      // silently fail
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <div>
      <div className='mb-4 flex items-center justify-between'>
        <h2 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'>
          Invoices {!isLoading && `(${invoices.length})`}
        </h2>
        <CreateInvoiceDialog onCreated={load} />
      </div>

      {isLoading ? (
        <div className='flex items-center justify-center py-12'>
          <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
        </div>
      ) : invoices.length === 0 ? (
        <EmptyState />
      ) : (
        <div className='space-y-2'>
          <AnimatePresence initial={false}>
            {invoices.map((invoice) => (
              <InvoiceRow key={invoice.id} invoice={invoice} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
