'use client'

import { motion, AnimatePresence } from 'motion/react'
import { RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { TokenInfo } from './token-selector'
import { TextShimmer } from '@/components/ui/text-shimmer'
import { REFRESH_INTERVAL_MS } from '@/lib/hooks/use-quote'

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
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>You pay</span>
              {isLoading || !quote ? (
                <TextShimmer className='text-md font-bold tracking-wide' duration={1.5}>
                  Refreshing
                </TextShimmer>
              ) : (
                <motion.span
                  key={quote.inAmount} // re-animate when value changes on refresh
                  initial={{ opacity: 0.4, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className='text-md font-bold text-foreground'
                >
                  {formatAmount(quote.inAmount, selectedToken.decimals)}&nbsp;{selectedToken.symbol}
                </motion.span>
              )}
            </div>

            <div className='mt-2 flex items-center justify-between border-t border-border/30 pt-2'>
              <span className='text-sm text-muted-foreground'>Merchant receives</span>
              <span className='text-sm font-semibold text-foreground'>{outputAmountUSDC}&nbsp;USDC</span>
            </div>

            {/* Footer row — inline loader when loading, otherwise fixed/refresh status */}
            <div className='mt-2 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground'>
              {isLoading || !quote ? (
                <TextShimmer duration={2}>Loading live prices...</TextShimmer>
              ) : isDirect ? (
                <>
                  <span className='inline-block h-1.5 w-1.5 rounded-full bg-green-500' />
                  Fixed rate · 1:1 direct transfer
                </>
              ) : (
                <>
                  <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
                  <RefreshTimer isRefreshing={isRefreshing} />
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
