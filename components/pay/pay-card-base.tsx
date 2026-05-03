'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { usePaymentLink } from '@/lib/hooks/use-payment-link'
import { useQuote } from '@/lib/hooks/use-quote'
import { TokenSelector, type TokenInfo } from './token-selector'
import { QuoteDisplay } from './quote-display'
import { PayButton } from './pay-button'
import { SuccessOverlay } from './success-overlay'
import { SolanaQRModal } from './solana-qr-modal'
import { ScanLine, FileText, CheckCircle } from 'lucide-react'
import { SubscribeButton } from './subscribe-button'
import type { SubscribeResult } from '@/lib/hooks/use-subscription-flow'

const INTERVAL_LABELS: Record<string, string> = {
  weekly: 'week',
  monthly: 'month',
  yearly: 'year',
}

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function PayCardBase({
  linkId,
  onPaid,
  allowInvoice,
}: {
  linkId: string
  onPaid?: (txSignature: string, details?: { swap?: { inputAmount: string; inputDecimals: number; inputSymbol: string }, tokenMint?: string }) => void
  allowInvoice?: boolean
}) {
  const { data: link, isLoading: linkLoading, error: linkError } = usePaymentLink(linkId)
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null)
  const [successResult, setSuccessResult] = useState<{
    sig: string
    swap?: { inputAmount: string; inputDecimals: number; inputSymbol: string }
  } | null>(null)
  const [subscribeResult, setSubscribeResult] = useState<SubscribeResult | null>(null)
  const {
    quote,
    isLoading: quoteLoading,
    isRefreshing,
    isDirect,
    error: quoteError,
  } = useQuote(linkId, selectedToken?.mint ?? null, link?.token ?? null, { disabled: !!successResult })
  const [showSolanaPayQR, setShowSolanaPayQR] = useState(false)

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className='w-full'
      >
        <div className='rounded-2xl border border-border/50 bg-card/80 p-6 shadow-2xl backdrop-blur-sm'>
          {/* Header */}
          <div className='mb-6 flex flex-col items-center text-center'>
            <div className='mb-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1'>
              <p className='text-[10px] font-medium uppercase tracking-widest text-indigo-500 dark:text-indigo-400'>
                Payment Request
              </p>
            </div>

            {link?.title && <h1 className='mt-2 text-2xl font-bold tracking-tight text-foreground'>{link.title}</h1>}

            {link?.description && (
              <p className='mt-2 max-w-[280px] text-sm text-muted-foreground leading-relaxed'>{link.description}</p>
            )}

            {link && (
              <div className='mt-4 flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-1.5 border border-border/40'>
                <div className='h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' />
                <p className='font-mono text-xs font-medium text-muted-foreground'>{shorten(link.merchantWallet)}</p>
              </div>
            )}

            {/* Short Separator */}
            <div className='mx-auto mt-2 h-px w-48 bg-linear-to-r from-transparent via-border to-transparent' />
          </div>

          <AnimatePresence mode='wait'>
            {successResult ? (
              <motion.div key='success' initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <SuccessOverlay txSignature={successResult.sig} amount={link?.amount ?? ''} swap={successResult.swap} />
              </motion.div>
            ) : linkLoading ? (
              <motion.div key='loading' className='space-y-3'>
                {[40, 28, 20].map((h, i) => (
                  <div key={i} className={`h-${h > 30 ? 12 : h > 24 ? 8 : 5} animate-pulse rounded-xl bg-muted`} />
                ))}
              </motion.div>
            ) : linkError === 'LINK_EXPIRED' ? (
              <motion.div
                key='expired'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className='py-10 text-center space-y-2'
              >
                <p className='text-2xl'>⏰</p>
                <p className='text-sm font-medium text-foreground'>This link has expired</p>
                <p className='text-xs text-muted-foreground'>
                  The merchant is no longer accepting payments on this link.
                </p>
              </motion.div>
            ) : linkError === 'LINK_SOLD_OUT' ? (
              <motion.div
                key='sold-out'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className='py-10 text-center space-y-2'
              >
                <p className='text-2xl'>🎟️</p>
                <p className='text-sm font-medium text-foreground'>Sold out</p>
                <p className='text-xs text-muted-foreground'>This link has reached its maximum number of payments.</p>
              </motion.div>
            ) : !allowInvoice && link?.type === 'invoice' ? (
              <motion.div
                key='invoice'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className='py-10 text-center space-y-2'
              >
                <div className='flex justify-center'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60'>
                    <FileText className='h-5 w-5 text-muted-foreground' />
                  </div>
                </div>
                <p className='text-sm font-medium text-foreground'>This is an invoice link</p>
                <p className='text-xs text-muted-foreground'>
                  Use the invoice URL shared by your merchant to view details and complete your payment.
                </p>
              </motion.div>
            ) : linkError || !link ? (
              <motion.div key='error' className='py-10 text-center'>
                <p className='text-sm text-muted-foreground'>This payment link is not available.</p>
              </motion.div>
            ) : link.type === 'subscription' ? (
              <motion.div key='subscription' className='space-y-4'>
                {subscribeResult ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className='py-6 text-center space-y-3'
                  >
                    <div className='flex justify-center'>
                      <CheckCircle className='h-12 w-12 text-green-500' />
                    </div>
                    <p className='text-sm font-semibold text-foreground'>You&apos;re subscribed!</p>
                    <p className='text-xs text-muted-foreground'>
                      Next billing:{' '}
                      {new Date(subscribeResult.currentPeriodEnd).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </motion.div>
                ) : (
                  <>
                    <div className='rounded-xl border border-border/30 bg-muted/20 p-4 text-center'>
                      <p className='text-xs text-muted-foreground'>Billed every {INTERVAL_LABELS[link.interval ?? 'month'] ?? link.interval}</p>
                      <p className='mt-1 text-4xl font-bold tracking-tight text-foreground'>
                        {Number(link.amount).toFixed(2)}
                      </p>
                      <p className='text-sm text-muted-foreground'>USDC</p>
                    </div>
                    <p className='text-center text-xs text-muted-foreground'>
                      You authorize Settlix to pull {Number(link.amount).toFixed(2)} USDC up to 12 times. Cancel anytime.
                    </p>
                    <SubscribeButton
                      linkId={linkId}
                      onSuccess={(result) => {
                        setSubscribeResult(result)
                        onPaid?.(result.txSignature)
                      }}
                    />
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div key='form' className='space-y-4'>
                {/* Amount due */}
                <div className='rounded-xl border border-border/30 bg-muted/20 p-4 text-center'>
                  <p className='text-xs text-muted-foreground'>Amount due</p>
                  <p className='mt-1 text-4xl font-bold tracking-tight text-foreground'>
                    {Number(link.amount).toFixed(2)}
                  </p>
                  <p className='text-sm text-muted-foreground'>USDC</p>
                </div>

                {/* Token selector */}
                <div>
                  <p className='mb-2 text-xs font-medium text-muted-foreground'>Pay with</p>
                  <TokenSelector selected={selectedToken} onChange={setSelectedToken} />
                </div>

                {/* Quote */}
                <QuoteDisplay
                  isLoading={quoteLoading}
                  isRefreshing={isRefreshing}
                  isDirect={isDirect}
                  quote={quote}
                  error={quoteError}
                  selectedToken={selectedToken}
                  outputAmountUSDC={Number(link.amount).toFixed(2)}
                />

                {/* Pay with wallet */}
                <PayButton
                  linkId={linkId}
                  selectedToken={selectedToken}
                  quoteReady={!!quote && !quoteLoading && !isRefreshing}
                  onSuccess={(sig, swap) => {
                    setSuccessResult({ sig, swap })
                    onPaid?.(sig, { swap, tokenMint: selectedToken?.mint })
                  }}
                />

                {/* Pay with Solana QR */}
                <button
                  type='button'
                  disabled={!selectedToken}
                  onClick={() => setShowSolanaPayQR(true)}
                  className='flex w-full items-center justify-center gap-2 rounded-xl border border-border/50 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40'
                >
                  <ScanLine className='h-4 w-4' />
                  {selectedToken ? 'Pay with Solana Pay' : 'Select a token to use QR'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Solana QR modal — rendered outside the card so it overlays the full page */}
      {showSolanaPayQR && selectedToken && (
        <SolanaQRModal
          linkId={linkId}
          selectedToken={selectedToken}
          onClose={() => setShowSolanaPayQR(false)}
          onSuccess={(sig) => {
            setShowSolanaPayQR(false)
            setSuccessResult({ sig })
            onPaid?.(sig, { tokenMint: selectedToken?.mint })
          }}
        />
      )}
    </>
  )
}
