'use client'

import { motion } from 'motion/react'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { ExternalLink, CheckCircle2, Download } from 'lucide-react'
import Image from 'next/image'
import { getLogoByMint, getSymbolByMint } from '@/lib/tokens/tokens'
import { JupiterLogo } from '@/components/shared/jupiter-logo'
import type { InvoiceData } from './invoice-pay-card'

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

interface InvoiceReceiptProps {
  invoice: InvoiceData
  txSignature: string
  finalInputAmount: string | null
  finalInputTokenSymbol: string | null
  finalInputToken: string
  isDirectPayment: boolean
}

export function InvoiceReceipt({
  invoice,
  txSignature,
  finalInputAmount,
  finalInputTokenSymbol,
  finalInputToken,
  isDirectPayment,
}: InvoiceReceiptProps) {
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
            <p className='text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3'>Amount Paid</p>
            <div className='flex items-baseline justify-center gap-2'>
              <span className='text-6xl font-mono font-bold tracking-tight text-foreground'>{fmt(invoice.amount)}</span>
              <span className='text-2xl font-medium text-muted-foreground'>USDC</span>
            </div>
          </div>

          {/* Receipt Details */}
          <div className='px-6 py-8 space-y-8'>
            <div className='flex justify-between items-center'>
              <div>
                <p className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1'>Billed To</p>
                <p className='text-sm font-medium text-foreground'>
                  {invoice.clientName ?? shorten(invoice.merchantWallet)}
                </p>
                {invoice.clientEmail && (
                  <p className='text-xs text-muted-foreground mt-0.5'>{invoice.clientEmail}</p>
                )}
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
              <p className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3'>Line Items</p>
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
                    {!isDirectPayment && finalInputToken !== invoice.token && Number(finalInputAmount) > 0 && (
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
