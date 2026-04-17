'use client'

import { JupiterLogo } from '@/components/shared/jupiter-logo'
import { TOKENS } from '@/lib/tokens/tokens'
import { motion } from 'motion/react'

// A curated subset of tokens from tokens.json that are most recognisable to
// judges/buyers. We hard-code just the display metadata here so this component
// has zero runtime dependencies — no JSON import, no hook.

const SHOWCASE_TOKENS = TOKENS.sort(() => Math.random() - 0.5)
  .slice(0, 5)
  .map((token) => {
    return {
      symbol: token.symbol,
      logoURI: token.logoURI,
    }
  })

interface TokenPillProps {
  symbol: string
  logoURI: string
  index: number
}

function TokenPill({ symbol, logoURI, index }: TokenPillProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.07, duration: 0.35 }}
      className='flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/40 px-2.5 py-1 backdrop-blur-sm'
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoURI}
        alt={symbol}
        width={16}
        height={16}
        className='h-4 w-4 rounded-full object-cover'
        onError={(e) => {
          // Fallback: hide broken image and show nothing (pill still shows symbol)
          ;(e.target as HTMLImageElement).style.display = 'none'
        }}
      />
      <span className='text-[11px] font-semibold text-foreground/80'>{symbol}</span>
    </motion.div>
  )
}

export function JupiterCallout() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className='w-full max-w-sm'
    >
      {/* Gradient border wrapper */}
      <div
        className='relative rounded-2xl p-px'
        style={{ background: 'linear-gradient(135deg, #9945FF44, #14F19544, #9945FF44)' }}
      >
        <div className='rounded-2xl bg-card/80 px-5 py-4 backdrop-blur-sm'>
          {/* Top row: copy + Jupiter attribution */}
          <div className='flex items-start justify-between gap-3'>
            <div>
              <p className='text-sm font-semibold leading-snug text-foreground'>
                Pay with <span className='text-indigo-600 dark:text-indigo-400'>any Solana token</span>
              </p>
              <p className='mt-0.5 text-xs text-muted-foreground'>Your merchant always receives USDC</p>
            </div>

            {/* Jupiter attribution */}
            <div className='shrink-0 flex flex-col items-end gap-1'>
              <p className='text-[9px] uppercase tracking-widest text-muted-foreground/60'>Powered by</p>
              <div className='flex items-center gap-1.5'>
                <JupiterLogo className='h-4 w-4' />
                <span className='text-[13px] font-bold tracking-tight text-foreground/90'>Jupiter</span>
              </div>
            </div>
          </div>

          {/* Token pills */}
          <div className='mt-3 flex flex-wrap gap-1.5'>
            {SHOWCASE_TOKENS.map((t, i) => (
              <TokenPill key={t.symbol} symbol={t.symbol} logoURI={t.logoURI} index={i} />
            ))}
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className='flex items-center rounded-full border border-dashed border-border/40 px-2.5 py-1 text-[11px] text-muted-foreground/60'
            >
              + more
            </motion.span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
