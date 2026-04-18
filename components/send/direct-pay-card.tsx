'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import { TokenSelector, type TokenInfo } from '@/components/pay/token-selector'
import { QuoteDisplay } from '@/components/pay/quote-display'
import { SuccessOverlay } from '@/components/pay/success-overlay'
import { JupiterCallout } from '@/components/pay/jupiter-callout'
import { DirectPayButton } from './direct-pay-button'
import { useDirectQuote } from '@/lib/hooks/use-direct-quote'

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

interface DirectPayCardProps {
  receiverWallet: string
  /** Human-decimal USDC amount, e.g. "10.500000" */
  amount: string
  onBack: () => void
}

export function DirectPayCard({ receiverWallet, amount, onBack }: DirectPayCardProps) {
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null)
  const [successResult, setSuccessResult] = useState<{
    sig: string
    swap?: { inputAmount: string; inputDecimals: number; inputSymbol: string }
  } | null>(null)

  const {
    quote,
    isLoading: quoteLoading,
    isRefreshing,
    isDirect,
    error: quoteError,
  } = useDirectQuote(selectedToken?.mint ?? null, receiverWallet, amount, { disabled: !!successResult })

  // Display amount stripped of trailing zeros for UI
  const displayAmount = parseFloat(amount).toFixed(2)

  return (
    <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
      <JupiterCallout />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className='w-full'
      >
        <div className='rounded-2xl border border-border/50 bg-card/80 p-6 shadow-2xl backdrop-blur-sm'>
          {/* Header */}
          <div className='mb-6'>
            <div className='flex items-center gap-2 mb-1'>
              {!successResult && (
                <button
                  onClick={onBack}
                  className='rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground'
                >
                  <ArrowLeft className='h-4 w-4' />
                </button>
              )}
              <h1 className='text-xl font-bold text-foreground'>Send Payment</h1>
            </div>
            <p className='font-mono text-xs text-muted-foreground ml-7'>to {shorten(receiverWallet)}</p>
          </div>

          <AnimatePresence mode='wait'>
            {successResult ? (
              <motion.div key='success' initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <SuccessOverlay txSignature={successResult.sig} amount={displayAmount} swap={successResult.swap} />
              </motion.div>
            ) : (
              <motion.div key='form' className='space-y-4'>
                {/* Amount due */}
                <div className='rounded-xl border border-border/30 bg-muted/20 p-4 text-center'>
                  <p className='text-xs text-muted-foreground'>Sending</p>
                  <p className='mt-1 text-4xl font-bold tracking-tight text-foreground'>{displayAmount}</p>
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
                  outputAmountUSDC={displayAmount}
                />

                {/* Pay button */}
                <DirectPayButton
                  receiverWallet={receiverWallet}
                  amount={amount}
                  selectedToken={selectedToken}
                  quoteReady={!!quote && !quoteLoading && !isRefreshing}
                  onSuccess={(sig, swap) => setSuccessResult({ sig, swap })}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
