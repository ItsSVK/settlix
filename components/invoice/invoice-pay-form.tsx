'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useQuote } from '@/lib/hooks/use-quote'
import { TokenSelector, type TokenInfo } from '@/components/pay/token-selector'
import { QuoteDisplay } from '@/components/pay/quote-display'
import { InvoicePayButton } from './invoice-pay-button'
import { SuccessOverlay } from '@/components/pay/success-overlay'

export function InvoicePayForm({
  invoiceId,
  amount,
  token,
  onPaid,
}: {
  invoiceId: string
  amount: string
  token: string
  onPaid?: (
    txSignature: string,
    details?: { swap?: { inputAmount: string; inputDecimals: number; inputSymbol: string }; tokenMint?: string },
  ) => void
}) {
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
  } = useQuote({ invoiceId }, selectedToken?.mint ?? null, token, { disabled: !!successResult })

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className='w-full'
    >
      <div className='rounded-2xl border border-border/50 bg-card/80 p-6 shadow-2xl backdrop-blur-sm'>
        <div className='mb-6 flex flex-col items-center text-center'>
          <div className='mb-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1'>
            <p className='text-[10px] font-medium uppercase tracking-widest text-indigo-500 dark:text-indigo-400'>
              Invoice Payment
            </p>
          </div>
          <div className='mx-auto mt-2 h-px w-48 bg-linear-to-r from-transparent via-border to-transparent' />
        </div>

        <AnimatePresence mode='wait'>
          {successResult ? (
            <motion.div key='success' initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <SuccessOverlay txSignature={successResult.sig} amount={amount} swap={successResult.swap} />
            </motion.div>
          ) : (
            <motion.div key='form' className='space-y-4'>
              <div className='rounded-xl border border-border/30 bg-muted/20 p-4 text-center'>
                <p className='text-xs text-muted-foreground'>Amount due</p>
                <p className='mt-1 text-4xl font-bold tracking-tight text-foreground'>{Number(amount).toFixed(2)}</p>
                <p className='text-sm text-muted-foreground'>USDC</p>
              </div>

              <div>
                <p className='mb-2 text-xs font-medium text-muted-foreground'>Pay with</p>
                <TokenSelector selected={selectedToken} onChange={setSelectedToken} />
              </div>

              <QuoteDisplay
                isLoading={quoteLoading}
                isRefreshing={isRefreshing}
                isDirect={isDirect}
                quote={quote}
                error={quoteError}
                selectedToken={selectedToken}
                outputAmountUSDC={Number(amount).toFixed(2)}
              />

              <InvoicePayButton
                invoiceId={invoiceId}
                selectedToken={selectedToken}
                quoteReady={!!quote && !quoteLoading && !isRefreshing}
                onSuccess={(sig, swap) => {
                  setSuccessResult({ sig, swap })
                  onPaid?.(sig, { swap, tokenMint: selectedToken?.mint })
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
