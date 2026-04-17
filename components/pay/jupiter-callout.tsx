'use client'

import { JupiterLogo } from '@/components/shared/jupiter-logo'
import { TOKENS } from '@/lib/tokens/tokens'
import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'

/**
 * A curated subset of tokens for the showcase.
 * We shuffle them once on mount to keep it fresh.
 */
const GET_ROTATING_TOKENS = () =>
  [...TOKENS]
    .sort(() => Math.random() - 0.5)
    .slice(0, 12)
    .map((token) => ({
      symbol: token.symbol,
      logoURI: token.logoURI,
      name: token.name,
    }))

export function JupiterCallout() {
  const tokens = useMemo(() => GET_ROTATING_TOKENS(), [])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % tokens.length)
    }, 3500) // 3.5s feels slightly more premium than 1s which might be too fast for reading names
    return () => clearInterval(timer)
  }, [tokens.length])

  const currentToken = tokens[index]

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className='w-full max-w-sm'
    >
      {/* Gradient border wrapper */}
      <div
        className='relative rounded-2xl p-px overflow-hidden'
        style={{
          background:
            'linear-gradient(135deg, rgba(153, 69, 255, 0.2), rgba(20, 241, 149, 0.2), rgba(153, 69, 255, 0.2))',
        }}
      >
        {/* Subtle animated background glow */}
        <div className='absolute inset-0 bg-linear-to-tr from-indigo-500/5 via-transparent to-emerald-500/5 animate-pulse' />

        <div className='relative rounded-2xl bg-card/95 px-5 py-3 backdrop-blur-sm border border-white/8 shadow-xl'>
          {/* Top row: copy + Jupiter attribution */}
          <div className='flex items-start justify-between gap-3'>
            <div>
              <p className='text-[13px] font-medium leading-tight text-foreground/90'>
                Pay with <span className='text-indigo-500 dark:text-indigo-400 font-bold'>any asset</span>
              </p>
              <p className='mt-0.5 text-[10px] text-muted-foreground/60'>Settled instantly in USDC</p>
            </div>

            {/* Jupiter attribution */}
            <div className='shrink-0 flex flex-col items-end gap-1'>
              <p className='text-[8px] uppercase tracking-[0.15em] text-muted-foreground/40 font-bold'>Powered by</p>
              <div className='flex items-center gap-1.5'>
                <JupiterLogo className='h-3 w-3 opacity-90' />
                <span className='text-[11px] font-bold tracking-tight text-foreground/80'>Jupiter</span>
              </div>
            </div>
          </div>

          {/* New Rotating Token Display */}
          <div className='mt-2.5 flex items-center justify-center h-8'>
            <AnimatePresence mode='wait'>
              <motion.div
                key={currentToken.symbol}
                initial={{ opacity: 0, y: 10, rotateX: -30 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                exit={{ opacity: 0, y: -10, rotateX: 30 }}
                transition={{
                  duration: 0.3,
                  ease: [0.23, 1, 0.32, 1],
                }}
                className='flex items-center gap-2 rounded-full bg-muted/50 border border-border/40 pl-1 pr-3 py-1 shadow-sm'
              >
                <div className='relative h-5 w-5 rounded-full overflow-hidden border border-white/10'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentToken.logoURI}
                    alt={currentToken.symbol}
                    className='h-full w-full object-cover'
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = '/token-placeholder.png'
                    }}
                  />
                </div>
                <div className='flex items-baseline gap-1.5 leading-none'>
                  <span className='text-[11px] font-bold text-foreground uppercase tracking-wide'>
                    {currentToken.symbol}
                  </span>
                  <span className='text-[9px] text-muted-foreground/50 truncate max-w-[70px]'>{currentToken.name}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* <div className='mt-2 text-center'>
            <p className='text-[9px] text-muted-foreground/30 font-medium tracking-wide uppercase'>
              + thousands more supported
            </p>
          </div> */}
        </div>
      </div>
    </motion.div>
  )
}
