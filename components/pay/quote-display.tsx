'use client'

import { motion, AnimatePresence } from 'motion/react'
import { RefreshCw, ArrowRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { TokenInfo } from './token-selector'
import { TextShimmer } from '@/components/ui/text-shimmer'
import { REFRESH_INTERVAL_MS } from '@/lib/hooks/use-quote'
import { JupiterLogo } from '@/components/shared/jupiter-logo'

interface QuoteDisplayProps {
  isLoading: boolean
  isRefreshing: boolean
  isDirect: boolean
  quote: { inAmount: string; outAmount: string } | null
  error: string | null
  selectedToken: TokenInfo | null
  outputAmountUSDC: string
}

function formatAmount(raw: string, decimals: number): string {
  const n = Number(raw) / Math.pow(10, decimals)
  if (n < 1) return n.toFixed(6)
  if (n < 1000) return n.toFixed(4)
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function RefreshTimer({ isRefreshing }: { isRefreshing: boolean }) {
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_MS / 1000)

  useEffect(() => {
    if (isRefreshing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCountdown(REFRESH_INTERVAL_MS / 1000)
      return
    }
    const interval = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(interval)
  }, [isRefreshing])

  return <span>{isRefreshing ? 'Refreshing…' : `Refreshes in ${countdown}s`}</span>
}

export function QuoteDisplay({
  isLoading,
  isRefreshing,
  isDirect,
  quote,
  error,
  selectedToken,
  outputAmountUSDC,
}: QuoteDisplayProps) {
  if (!selectedToken) {
    return (
      <div className='rounded-xl border border-border/30 bg-muted/20 p-4 text-center text-sm text-muted-foreground'>
        Select a token to see the exchange rate
      </div>
    )
  }

  return (
    <div className='space-y-2'>
      <AnimatePresence mode='wait'>
        {error && !quote && !isLoading ? (
          <motion.div
            key='error'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive'
          >
            {error}
          </motion.div>
        ) : (
          <motion.div
            key='quote-card'
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className='rounded-xl border border-primary/20 bg-primary/5 p-4'
          >
            {/* Swap direction row: YOU PAY → THEY RECEIVE */}
            <div className='flex items-center gap-3'>
              {/* Input side — amount on one line, symbol below */}
              <div className='flex min-w-0 flex-1 flex-col items-start gap-0.5'>
                <span className='text-[10px] font-medium uppercase tracking-widest text-muted-foreground'>You pay</span>
                {isLoading || !quote ? (
                  <TextShimmer className='text-lg font-bold tracking-tight' duration={1.5}>
                    Loading…
                  </TextShimmer>
                ) : (
                  <motion.div
                    key={quote.inAmount}
                    initial={{ opacity: 0.4, y: -3 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className='flex w-full flex-col'
                  >
                    <span className='truncate text-xl font-bold leading-tight text-foreground'>
                      {formatAmount(quote.inAmount, selectedToken.decimals)}
                    </span>
                    <span className='text-xs font-semibold text-muted-foreground'>{selectedToken.symbol}</span>
                  </motion.div>
                )}
              </div>

              {/* Arrow connector — fixed size, never shrinks */}
              <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/15'>
                <ArrowRight className='h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400' />
              </div>

              {/* Output side — amount on one line, USDC below */}
              <div className='flex min-w-0 flex-1 flex-col items-end gap-0.5'>
                <span className='text-[10px] font-medium uppercase tracking-widest text-muted-foreground'>
                  They receive
                </span>
                <div className='flex flex-col items-end'>
                  <span className='text-xl font-bold leading-tight text-foreground'>{outputAmountUSDC}</span>
                  <span className='text-xs font-semibold text-green-500'>USDC</span>
                </div>
              </div>
            </div>

            {/* Footer: source label + refresh status */}
            <div className='mt-3 flex items-center justify-between border-t border-border/30 pt-2.5 text-[10px] text-muted-foreground'>
              {/* Left: swap source badge */}
              <span
                className={
                  isDirect ? 'flex items-center gap-1' : 'flex items-center gap-1 text-indigo-500 dark:text-indigo-400'
                }
              >
                {isDirect ? (
                  <>
                    <span className='inline-block h-1.5 w-1.5 rounded-full bg-green-500' />
                    Direct transfer · 1:1
                  </>
                ) : (
                  <>
                    <JupiterLogo className='h-3 w-3' />
                    via Jupiter swap
                  </>
                )}
              </span>

              {/* Right: refresh countdown */}
              {!isDirect && (
                <span className='flex items-center gap-1'>
                  <RefreshCw
                    className={`h-2.5 w-2.5 ${isRefreshing || isLoading ? 'animate-spin text-primary' : ''}`}
                  />
                  {isLoading || !quote ? (
                    <TextShimmer duration={2}>Loading live prices…</TextShimmer>
                  ) : (
                    <RefreshTimer isRefreshing={isRefreshing} />
                  )}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
