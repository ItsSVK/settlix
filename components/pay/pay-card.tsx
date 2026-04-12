'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { usePaymentLink } from '@/lib/hooks/use-payment-link'
import { useQuote } from '@/lib/hooks/use-quote'
import { TokenSelector, type TokenInfo } from './token-selector'
import { QuoteDisplay } from './quote-display'
import { PayButton } from './pay-button'
import { SuccessOverlay } from './success-overlay'
import { BackgroundBeams } from '@/components/ui/background-beams'

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function PayCard({ linkId }: { linkId: string }) {
  const { data: link, isLoading: linkLoading, error: linkError } = usePaymentLink(linkId)
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null)
  const {
    quote,
    isLoading: quoteLoading,
    isRefreshing,
    countdown,
    isDirect,
    error: quoteError,
  } = useQuote(
    linkId,
    selectedToken?.mint ?? null,
    link?.token ?? null, // outputMint — used to detect same-mint and skip polling
  )
  const [successTx, setSuccessTx] = useState<string | null>(null)

  return (
    <div className='relative flex flex-1 w-full items-center justify-center bg-background px-4 py-20'>
      <BackgroundBeams className='opacity-40' />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className='relative z-10 w-full max-w-sm'
      >
        <div className='rounded-2xl border border-border/50 bg-card/80 p-6 shadow-2xl backdrop-blur-sm'>
          {/* Header */}
          <div className='mb-6 text-center'>
            <h1 className='text-xl font-bold text-foreground'>Payment Request</h1>
            {link && (
              <p className='mt-1 font-mono text-xs text-muted-foreground'>from {shorten(link.merchantWallet)}</p>
            )}
          </div>

          <AnimatePresence mode='wait'>
            {successTx ? (
              <motion.div key='success' initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <SuccessOverlay txSignature={successTx} amount={link?.amount ?? ''} />
              </motion.div>
            ) : linkLoading ? (
              <motion.div key='loading' className='space-y-3'>
                {[40, 28, 20].map((h, i) => (
                  <div key={i} className={`h-${h > 30 ? 12 : h > 24 ? 8 : 5} animate-pulse rounded-xl bg-muted`} />
                ))}
              </motion.div>
            ) : linkError || !link ? (
              <motion.div key='error' className='py-10 text-center'>
                <p className='text-sm text-muted-foreground'>This payment link is not available.</p>
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
                  countdown={countdown}
                  isDirect={isDirect}
                  quote={quote}
                  error={quoteError}
                  selectedToken={selectedToken}
                  outputAmountUSDC={Number(link.amount).toFixed(2)}
                />

                {/* Pay button */}
                <PayButton
                  linkId={linkId}
                  selectedToken={selectedToken}
                  quoteReady={!!quote && !quoteLoading && !isRefreshing}
                  onSuccess={(sig) => setSuccessTx(sig)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
