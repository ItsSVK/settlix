'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronLeft, ChevronRight, Copy, Check, ExternalLink, ChevronDown, Mail, Loader2 } from 'lucide-react'
import { CreateInvoiceDialog } from '@/components/dashboard/invoices/create-invoice-dialog'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { Button } from '@/components/ui/button'
import { ConfirmationModal } from '@/components/shared/confirmation-modal'
import { copyText } from '@/lib/utils'
import { toast } from 'sonner'
import { getLogoByMint, TOKENS } from '@/lib/tokens/tokens'
import type { Invoice } from '@/lib/hooks/use-invoices'
import { SkeletonRow } from '@/components/shared/skeletons'

interface InvoicesTableProps {
  invoices: Invoice[]
  isLoading: boolean
  onRefresh: () => void
  archiveInvoice: (id: string) => Promise<void>
  sendInvoice: (id: string) => Promise<void>
}

function shorten(s: string, start = 6, end = 4) {
  return `${s.slice(0, start)}…${s.slice(-end)}`
}

function InvoiceRow({
  invoice,
  onRefresh,
  archiveInvoice,
  sendInvoice,
}: {
  invoice: Invoice
  onRefresh: () => void
  archiveInvoice: (id: string) => Promise<void>
  sendInvoice: (id: string) => Promise<void>
}) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [archiving, setArchiving] = useState<string | null>(null)
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const handleSendMail = async () => {
    setSending(true)
    try {
      await sendInvoice(invoice.id)
    } finally {
      setSending(false)
    }
  }
  const invoiceUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/invoice/${invoice.id}`

  const handleArchive = async (id: string) => {
    setArchiving(id)
    try {
      await archiveInvoice(id)
      onRefresh()
    } catch {
      toast.error('Failed to archive invoice')
    } finally {
      setArchiving(null)
      setConfirmArchive(null)
    }
  }

  const isOverdue = invoice.status === 'overdue'
  const isPaid = invoice.status === 'paid'

  return (
    <div className='group rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm shadow-sm transition-all hover:bg-card/60 hover:border-border/60 hover:shadow-md'>
      <div className='flex cursor-pointer items-center gap-3 p-3.5' onClick={() => setExpanded((v) => !v)}>
        {/* Status Badge */}
        <div
          className={`flex items-center gap-1.5 rounded-full px-2 py-2 md:py-0.5 text-[9px] font-bold uppercase tracking-wider ${
            isOverdue
              ? 'bg-destructive/10 text-destructive'
              : isPaid
                ? 'bg-green-500/10 text-green-500'
                : 'bg-amber-500/10 text-amber-500'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isOverdue ? 'bg-destructive' : isPaid ? 'bg-green-500' : 'bg-amber-500'
            }`}
          />
          <span className='hidden md:flex'>{isOverdue ? 'Overdue' : isPaid ? 'Paid' : 'Unpaid'}</span>
        </div>

        {/* Info */}
        <div className='flex flex-col flex-1 min-w-0'>
          {invoice.clientName ? (
            <span className='truncate text-[13px] font-semibold text-foreground'>{invoice.clientName}</span>
          ) : (
            <span className='truncate font-mono text-[11px] text-muted-foreground/70'>{shorten(invoice.id, 8, 6)}</span>
          )}
          <div className='flex items-center gap-1.5 flex-wrap'>
            <span className='text-xs font-bold text-foreground flex items-center gap-1'>
              <Image
                src={getLogoByMint(invoice.token) || TOKENS[0].logoURI}
                alt='token'
                width={16}
                height={16}
                className='inline-block'
              />
              {Number(invoice.amount).toFixed(2)}
            </span>
            {(invoice.clientEmail || invoice.memo) && (
              <span className='truncate text-[11px] text-muted-foreground max-w-[200px]'>
                • {invoice.clientEmail ? invoice.clientEmail : invoice.memo}
              </span>
            )}
          </div>
        </div>

        {/* Actions Strip */}
        <div
          className='flex items-center gap-1 rounded-xl bg-muted/40 pl-2 border border-border/30'
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            onClick={() => copyText(invoiceUrl, setCopied)}
            title='Copy URL'
            variant='ghost'
            size='sm'
            className='h-6 w-6 rounded-lg p-0 text-muted-foreground hover:bg-background/80 hover:text-foreground transition-colors'
          >
            {copied ? <Check className='h-3 w-3 text-green-500' /> : <Copy className='h-3 w-3' />}
          </Button>

          {/* Open page */}
          <Button
            onClick={() => window.open(invoiceUrl, '_blank')}
            title='Open page'
            variant='ghost'
            size='sm'
            className='hidden md:flex h-6 w-6 rounded-lg p-0 text-muted-foreground hover:bg-background/80 hover:text-foreground transition-colors'
          >
            <ExternalLink className='h-3 w-3' />
          </Button>

          {/* Send mail — only if client email exists and not yet paid */}
          {invoice.clientEmail && !isPaid && (
            <Button
              onClick={handleSendMail}
              disabled={sending}
              title={`Send invoice to ${invoice.clientEmail}`}
              variant='ghost'
              size='sm'
              className='hidden md:flex h-6 w-6 rounded-lg p-0 text-muted-foreground hover:bg-background/80 hover:text-foreground transition-colors'
            >
              {sending ? <Loader2 className='h-3 w-3 animate-spin' /> : <Mail className='h-3 w-3' />}
            </Button>
          )}

          <div className='w-px h-4 bg-border/50 mx-1' />

          <ConfirmationModal
            className='text-red-500 h-6 w-6 rounded-lg p-0 hover:bg-background/80 hover:text-foreground transition-colors'
            handleArchive={handleArchive}
            archiving={archiving}
            confirmArchive={confirmArchive}
            setConfirmArchive={setConfirmArchive}
            item={{ id: invoice.id }}
            type='Archive'
          />
        </div>

        <div className='hidden md:flex h-6 w-6 items-center justify-center rounded-full bg-muted/40 transition-colors group-hover:bg-muted/80 ml-2'>
          <ChevronDown
            className={`h-3 w-3 text-muted-foreground transition-transform duration-300 ${
              expanded ? 'rotate-180' : ''
            }`}
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
            <div className='border-t border-border/30 bg-muted/10 px-3.5 pb-4 pt-3'>
              <div className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex justify-center'>
                {invoice.dueDate ? (
                  <span className={isOverdue ? 'text-destructive' : ''}>
                    Due:{' '}
                    {new Date(invoice.dueDate).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                ) : (
                  <span>No due date</span>
                )}
                <span className='mx-2'>•</span>
                <span>
                  Created:{' '}
                  {new Date(invoice.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>

              {invoice.lineItems.length > 0 && (
                <div className='mt-3 space-y-2'>
                  <p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>Line Items</p>
                  <div className='flex flex-col gap-1.5'>
                    {invoice.lineItems.map((item) => (
                      <div
                        key={item.id}
                        className='flex justify-between text-xs text-foreground bg-card border border-border/60 px-3 py-2 rounded-xl'
                      >
                        <span>{item.description}</span>
                        <span className='font-mono'>
                          {item.quantity} x {Number(item.unitPrice).toFixed(2)} USDC
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function InvoicesTable({ invoices, isLoading, onRefresh, archiveInvoice, sendInvoice }: InvoicesTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const totalPages = Math.ceil(invoices.length / itemsPerPage)
  const safePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages))

  const currentInvoices = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage
    return invoices.slice(start, start + itemsPerPage)
  }, [invoices, safePage, itemsPerPage])

  if (isLoading) {
    return (
      <div className='space-y-3'>
        {[1, 2, 3].map((i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className='relative flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 py-20 text-center overflow-hidden'>
        <BackgroundBeams className='opacity-20' />
        <div className='relative z-10'>
          <p className='text-lg font-semibold text-foreground'>No invoices yet</p>
          <p className='mt-2 text-sm text-muted-foreground'>Create an invoice to bill your clients in USDC.</p>
          <div className='mt-5 flex justify-center'>
            <CreateInvoiceDialog onCreated={onRefresh} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-3'>
      <AnimatePresence initial={false}>
        {currentInvoices.map((invoice, i) => (
          <motion.div
            key={invoice.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <InvoiceRow
              invoice={invoice}
              onRefresh={onRefresh}
              archiveInvoice={archiveInvoice}
              sendInvoice={sendInvoice}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className='flex items-center justify-between px-2 pt-4'
        >
          <div className='text-xs text-muted-foreground'>
            {/* Desktop: full text */}
            <span className='hidden sm:inline'>
              Showing <span className='font-medium text-foreground'>{(safePage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className='font-medium text-foreground'>{Math.min(safePage * itemsPerPage, invoices.length)}</span>{' '}
              of <span className='font-medium text-foreground'>{invoices.length}</span> results
            </span>
            {/* Mobile: concise text */}
            <span className='sm:hidden'>
              <span className='font-medium text-foreground'>
                {(safePage - 1) * itemsPerPage + 1} - {Math.min(safePage * itemsPerPage, invoices.length)}
              </span>{' '}
              of <span className='font-medium text-foreground'>{invoices.length}</span>
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
              disabled={safePage === 1}
              className='h-8 rounded-xl border-border/40 shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:shadow-none transition-all hover:border-border/70 hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:hover:shadow-none bg-card text-muted-foreground hover:text-foreground'
            >
              <ChevronLeft className='mr-1 h-3.5 w-3.5' />
              Previous
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
              disabled={safePage === totalPages}
              className='h-8 rounded-xl border-border/40 shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:shadow-none transition-all hover:border-border/70 hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:hover:shadow-none bg-card text-muted-foreground hover:text-foreground'
            >
              Next
              <ChevronRight className='ml-1 h-3.5 w-3.5' />
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
