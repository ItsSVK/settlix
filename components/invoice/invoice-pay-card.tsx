'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { PayCardBase } from '@/components/pay/pay-card-base'
import { JupiterCallout } from '@/components/pay/jupiter-callout'
import { ExternalLink, CheckCircle2, Clock, AlertTriangle, ArrowRight, Download } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { getLogoByMint, getSymbolByMint, TOKENS } from '@/lib/tokens/tokens'
import { JupiterLogo } from '@/components/shared/jupiter-logo'

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
  /** Display symbol for the settlement token (e.g. "USDC") */
  tokenSymbol: string
  /** Token mint the client actually paid with */
  inputToken: string | null
  /** Human-readable amount the client paid in their chosen token */
  inputAmount: string | null
  /** Symbol of the token the client paid with */
  inputTokenSymbol: string | null
}

export function InvoicePayCard({ invoice }: { invoice: InvoiceData }) {
  const router = useRouter()
  const [localSuccess, setLocalSuccess] = useState<{
    txSignature: string
    swap?: { inputAmount: string; inputDecimals: number; inputSymbol: string }
    tokenMint?: string
  } | null>(null)

  const handlePaid = (
    txSignature: string,
    details?: { swap?: { inputAmount: string; inputDecimals: number; inputSymbol: string }; tokenMint?: string },
  ) => {
    setLocalSuccess({ txSignature, ...details })
    router.refresh()
  }

  const isPaid = invoice.status === 'paid' || !!localSuccess
  const isOverdue = invoice.status === 'overdue' && !isPaid
  const txSignature = localSuccess?.txSignature || invoice.txSignature

  const displayInputTokenSymbol = localSuccess?.swap?.inputSymbol || invoice.inputTokenSymbol
  const displayInputAmountRaw = localSuccess?.swap
    ? (Number(localSuccess.swap.inputAmount) / Math.pow(10, localSuccess.swap.inputDecimals)).toString()
    : invoice.inputAmount

  const isDirectPayment = localSuccess
    ? !localSuccess.swap
    : invoice.inputToken === invoice.token || !invoice.inputToken
  const finalInputTokenSymbol = isDirectPayment ? invoice.tokenSymbol : displayInputTokenSymbol
  const finalInputAmount = isDirectPayment ? invoice.amount : displayInputAmountRaw
  const finalInputToken = localSuccess?.tokenMint || invoice.inputToken || invoice.token

  if (isPaid) {
    return (
      <div className='relative flex min-h-screen w-full flex-col items-center justify-center bg-background px-4 py-20 overflow-hidden'>
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-green-500/5 via-background to-background opacity-70 z-0' />
        <BackgroundBeams className='opacity-30' />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className='relative z-10 w-full max-w-lg space-y-8 mt-10'
        >
          {/* Success Header */}
          <div className='flex flex-col items-center text-center space-y-4'>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
              className='relative flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 ring-1 ring-green-500/20'
            >
              <div className='absolute inset-0 rounded-full bg-green-500/20 blur-xl animate-pulse' />
              <CheckCircle2 className='h-10 w-10 text-green-500 relative z-10' />
            </motion.div>
            <div className='space-y-1.5'>
              <h1 className='text-3xl font-bold tracking-tight text-foreground'>Payment Successful</h1>
              <p className='text-muted-foreground'>Receipt for Invoice #{invoice.id.slice(-10).toUpperCase()}</p>
            </div>
          </div>

          {/* Receipt Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className='rounded-3xl border border-green-500/20 bg-card/60 backdrop-blur-xl shadow-[0_0_40px_-10px_rgba(34,197,94,0.1)] overflow-hidden relative'
          >
            {/* Amount Banner */}
            <div className='bg-green-500/5 px-6 py-10 text-center border-b border-border/40 relative overflow-hidden'>
              <div className='absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-green-500/50 to-transparent opacity-50' />
              <p className='text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3'>
                Amount Paid
              </p>
              <div className='flex items-baseline justify-center gap-2'>
                <span className='text-6xl font-mono font-bold tracking-tight text-foreground'>
                  {fmt(invoice.amount)}
                </span>
                <span className='text-2xl font-medium text-muted-foreground'>USDC</span>
              </div>
            </div>

            {/* Receipt Details */}
            <div className='px-6 py-8 space-y-8'>
              <div className='flex justify-between items-center'>
                <div>
                  <p className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1'>
                    Billed To
                  </p>
                  <p className='text-sm font-medium text-foreground'>
                    {invoice.clientName ?? shorten(invoice.merchantWallet)}
                  </p>
                  {invoice.clientEmail && <p className='text-xs text-muted-foreground mt-0.5'>{invoice.clientEmail}</p>}
                </div>
                <div className='text-right'>
                  <p className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1'>Date</p>
                  <p className='text-sm font-medium text-foreground'>
                    {new Date(invoice.createdAt).toLocaleDateString(undefined, {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div>
                <p className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3'>
                  Line Items
                </p>
                <div className='space-y-3 rounded-2xl bg-muted/30 p-4 border border-border/30'>
                  {invoice.lineItems.map((item) => (
                    <div key={item.id} className='flex justify-between items-center text-sm'>
                      <span className='text-foreground/80'>
                        {item.description} <span className='text-xs text-muted-foreground ml-1'>x{item.quantity}</span>
                      </span>
                      <span className='font-mono font-medium text-foreground'>
                        {lineTotal(item.quantity, item.unitPrice)}
                      </span>
                    </div>
                  ))}
                  <div className='pt-3 mt-3 border-t border-border/40 flex justify-between items-center text-sm font-semibold'>
                    <span className='text-muted-foreground'>Total</span>
                    <span className='font-mono'>{fmt(invoice.amount)}</span>
                  </div>
                </div>
              </div>

              {txSignature && (
                <div className='space-y-3 pt-4'>
                  {finalInputAmount && finalInputTokenSymbol && (
                    <div className='w-full rounded-2xl border border-border/30 bg-muted/20 divide-y divide-border/30 text-left mb-4'>
                      <div className='flex items-center justify-between px-4 py-3'>
                        <span className='text-xs text-muted-foreground'>You paid</span>
                        <span className='text-sm font-semibold text-foreground'>
                          {finalInputAmount}{' '}
                          <span className='text-muted-foreground font-normal'>{finalInputTokenSymbol}</span>
                        </span>
                      </div>
                      <div className='flex items-center justify-between px-4 py-3'>
                        <span className='text-xs text-muted-foreground'>Merchant received</span>
                        <span className='text-sm font-semibold text-foreground'>
                          {fmt(invoice.amount)}{' '}
                          <span className='text-green-500 font-normal'>{invoice.tokenSymbol}</span>
                        </span>
                      </div>
                      {finalInputToken !== invoice.token && Number(finalInputAmount) > 0 && (
                        <div className='flex items-center justify-between px-4 py-3'>
                          <span className='text-xs text-muted-foreground'>Rate</span>
                          <div className='flex items-center'>
                            <JupiterLogo className='h-3.5 w-3.5 opacity-80 mr-[30px]' />
                            <span className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                              1{' '}
                              <Image
                                src={getLogoByMint(finalInputToken) ?? ''}
                                alt={getSymbolByMint(finalInputToken) ?? ''}
                                width={16}
                                height={16}
                                className='rounded-full'
                              />
                              = {(Number(invoice.amount) / Number(finalInputAmount)).toFixed(4)}{' '}
                              <Image
                                src={getLogoByMint(invoice.token) ?? ''}
                                alt={getSymbolByMint(invoice.token) ?? ''}
                                width={16}
                                height={16}
                                className='rounded-full'
                              />
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <a
                    href={`https://solscan.io/tx/${txSignature}${SOLSCAN_CLUSTER}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='group flex items-center justify-between w-full rounded-xl bg-background border border-border/50 p-4 transition-all hover:bg-muted/50 hover:border-border'
                  >
                    <div>
                      <p className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1'>
                        Transaction Hash
                      </p>
                      <p className='font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors'>
                        {shorten(txSignature, 12, 12)}
                      </p>
                    </div>
                    <div className='flex h-8 w-8 items-center justify-center rounded-full bg-muted border border-border/50 group-hover:bg-background transition-colors'>
                      <ExternalLink className='h-3.5 w-3.5 text-foreground/70 group-hover:text-foreground' />
                    </div>
                  </a>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className='flex justify-center'
          >
            <button
              onClick={() => window.print()}
              className='flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-full hover:bg-muted/50 border border-transparent hover:border-border/50 cursor-pointer'
            >
              <Download className='h-3.5 w-3.5' /> Download Receipt
            </button>
          </motion.div>
        </motion.div>
      </div>
    )
  }

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
            {isOverdue ? (
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
        </div>

        {/* Payment widget */}
        <div className='flex flex-col items-center gap-4 w-full max-w-sm mx-auto'>
          <JupiterCallout />
          <PayCardBase linkId={invoice.linkId} allowInvoice onPaid={handlePaid} />
        </div>
      </div>
    </div>
  )
}
