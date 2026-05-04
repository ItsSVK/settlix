'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Invoice, useInvoices } from '@/lib/hooks/use-invoices'
import { Check, ChevronDown, Copy, ExternalLink, Loader2, Mail } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { copyText, shorten } from '@/lib/utils'
import { ConfirmationModal } from '@/components/shared/confirmation-modal'
import { getLogoByMint, TOKENS } from '@/lib/tokens/tokens'

export function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const { archiveInvoice, archiveInvoicePending, sendInvoice, sendInvoicePending } = useInvoices()
  const invoiceUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/invoice/${invoice.id}`

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
              onClick={() => sendInvoice(invoice.id)}
              disabled={sendInvoicePending}
              title={`Send invoice to ${invoice.clientEmail}`}
              variant='ghost'
              size='sm'
              className='hidden md:flex h-6 w-6 rounded-lg p-0 text-muted-foreground hover:bg-background/80 hover:text-foreground transition-colors'
            >
              {sendInvoicePending ? <Loader2 className='h-3 w-3 animate-spin' /> : <Mail className='h-3 w-3' />}
            </Button>
          )}

          <div className='w-px h-4 bg-border/50 mx-1' />

          <ConfirmationModal
            className='text-red-500 h-6 w-6 rounded-lg p-0 hover:bg-background/80 hover:text-foreground transition-colors'
            onConfirm={archiveInvoice}
            isPending={archiveInvoicePending}
            id={invoice.id}
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
