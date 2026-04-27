'use client'

import { BackgroundBeams } from '@/components/ui/background-beams'
import { PayCardBase } from '@/components/pay/pay-card-base'
import { JupiterCallout } from '@/components/pay/jupiter-callout'
import { ExternalLink, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'

const SOLSCAN_CLUSTER = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet' ? '?cluster=devnet' : ''

function shorten(addr: string, start = 6, end = 4) {
  return `${addr.slice(0, start)}…${addr.slice(-end)}`
}

function fmt(n: string) {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function lineTotal(qty: string, price: string) {
  return (Number(qty) * Number(price)).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export interface InvoiceData {
  id: string
  merchantWallet: string
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
  lineItems: { id: string; description: string; quantity: string; unitPrice: string }[]
}

export function InvoicePayCard({ invoice }: { invoice: InvoiceData }) {
  const isPaid = invoice.status === 'paid'
  const isOverdue = invoice.status === 'overdue'

  return (
    <div className='relative flex min-h-screen w-full flex-col items-center bg-background px-4 py-20'>
      <BackgroundBeams className='opacity-30' />

      <div className='relative z-10 w-full max-w-2xl space-y-5 mt-15'>
        {/* Header */}
        <div className='flex items-start justify-between'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-widest text-muted-foreground'>
              Settl<span className='text-primary'>i</span>X Invoice
            </p>
            <p className='mt-0.5 font-mono text-[11px] text-muted-foreground/60'>
              #{invoice.id.slice(-10).toUpperCase()}
            </p>
          </div>

          <div className='flex items-center gap-2'>
            {isPaid ? (
              <span className='flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-500 ring-1 ring-green-500/20'>
                <CheckCircle2 className='h-3.5 w-3.5' /> Paid
              </span>
            ) : isOverdue ? (
              <span className='flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive ring-1 ring-destructive/20'>
                <AlertTriangle className='h-3.5 w-3.5' /> Overdue
              </span>
            ) : (
              <span className='flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-500 ring-1 ring-amber-500/20'>
                <Clock className='h-3.5 w-3.5' /> Unpaid
              </span>
            )}
          </div>
        </div>

        {/* Invoice details card */}
        <div className='rounded-3xl border border-border/40 bg-card/40 backdrop-blur-sm shadow-sm divide-y divide-border/30'>
          {/* From / To / Dates */}
          <div className='grid grid-cols-2 gap-4 px-6 py-5 sm:grid-cols-4'>
            <div>
              <p className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>From</p>
              <p className='mt-1 font-mono text-xs text-foreground'>{shorten(invoice.merchantWallet)}</p>
            </div>
            <div>
              <p className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>To</p>
              <p className='mt-1 text-xs text-foreground'>{invoice.clientName ?? '—'}</p>
              {invoice.clientEmail && <p className='text-[11px] text-muted-foreground'>{invoice.clientEmail}</p>}
            </div>
            <div>
              <p className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>Issued</p>
              <p className='mt-1 text-xs text-foreground'>
                {new Date(invoice.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
            {invoice.dueDate && (
              <div>
                <p className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>Due</p>
                <p
                  className={`mt-1 text-xs font-semibold ${
                    isOverdue && !isPaid ? 'text-destructive' : 'text-foreground'
                  }`}
                >
                  {new Date(invoice.dueDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Line items */}
          <div className='px-6 py-5'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-border/30'>
                  <th className='pb-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
                    Description
                  </th>
                  <th className='pb-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
                    Qty
                  </th>
                  <th className='pb-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
                    Unit Price
                  </th>
                  <th className='pb-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border/20'>
                {invoice.lineItems.map((item) => (
                  <tr key={item.id}>
                    <td className='py-2.5 pr-4 text-[13px] text-foreground'>{item.description}</td>
                    <td className='py-2.5 text-right text-[13px] text-muted-foreground'>
                      {Number(item.quantity).toLocaleString()}
                    </td>
                    <td className='py-2.5 text-right font-mono text-[13px] text-muted-foreground'>
                      {fmt(item.unitPrice)}
                    </td>
                    <td className='py-2.5 text-right font-mono text-[13px] font-medium text-foreground'>
                      {lineTotal(item.quantity, item.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className='border-t border-border/40'>
                  <td
                    colSpan={3}
                    className='pt-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground'
                  >
                    Total
                  </td>
                  <td className='pt-3 text-right font-mono text-base font-bold text-foreground'>
                    {fmt(invoice.amount)} <span className='text-sm font-normal text-muted-foreground'>USDC</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Memo */}
          {invoice.memo && (
            <div className='px-6 py-4'>
              <p className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>Note</p>
              <p className='mt-1 text-sm text-muted-foreground'>{invoice.memo}</p>
            </div>
          )}

          {/* Paid receipt */}
          {isPaid && invoice.txSignature && (
            <div className='flex items-center justify-between px-6 py-4'>
              <div>
                <p className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>Transaction</p>
                <p className='mt-1 font-mono text-xs text-muted-foreground'>{shorten(invoice.txSignature, 8, 6)}</p>
              </div>
              <a
                href={`https://solscan.io/tx/${invoice.txSignature}${SOLSCAN_CLUSTER}`}
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center gap-1.5 rounded-xl bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors'
              >
                <ExternalLink className='h-3 w-3' /> View on Solscan
              </a>
            </div>
          )}
        </div>

        {/* Payment widget — only shown if unpaid */}
        {!isPaid && (
          <div className='flex flex-col items-center gap-4 w-full max-w-sm mx-auto'>
            <JupiterCallout />
            <PayCardBase linkId={invoice.linkId} allowInvoice />
          </div>
        )}
      </div>
    </div>
  )
}
