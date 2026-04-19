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
    }, 2500) // 2.5s feels slightly more premium than 1s which might be too fast for reading names
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

        <div className='relative rounded-2xl bg-card/95 px-5 py-3.5 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-white/5'>
          <div className='flex flex-row items-center justify-between gap-4'>
            
            {/* Left side: Pay with + Animation */}
            <div className='flex flex-col justify-center h-full'>
              <div className='flex items-center gap-1.5 h-[22px]'>
                <span className='text-[14px] font-medium text-muted-foreground whitespace-nowrap'>
                  Pay with
                </span>
                
                <div className='relative min-w-[90px] h-full overflow-hidden'>
                  <AnimatePresence mode='popLayout'>
                    <motion.div
                      key={currentToken.symbol}
                      initial={{ opacity: 0, y: 15, filter: 'blur(3px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: -15, filter: 'blur(3px)' }}
                      transition={{
                        duration: 0.5,
                        ease: [0.16, 1, 0.3, 1], // Smooth apple-like spring
                      }}
                      className='absolute inset-0 flex items-center justify-start gap-1.5'
                    >
                      <div className='h-[18px] w-[18px] rounded-full overflow-hidden border border-border/80 shrink-0 bg-background shadow-xs'>
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
                      <span className='text-[14px] font-bold text-foreground uppercase tracking-tight'>
                        {currentToken.symbol}
                      </span>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
              <p className='text-[9px] text-muted-foreground/60 font-semibold tracking-[0.08em] uppercase mt-1'>
                Settled instantly in USDC
              </p>
            </div>

            {/* Jupiter attribution */}
            <div className='shrink-0 flex items-center gap-1.5 rounded-full bg-muted/40 px-2.5 py-1.5 border border-border/30 shadow-xs backdrop-blur-sm transition-colors hover:bg-muted/60'>
              <JupiterLogo className='h-3.5 w-3.5 opacity-80' />
              <span className='text-[10px] font-semibold tracking-tight text-foreground/70 pr-0.5'>Powered</span>
            </div>

          </div>
        </div>
      </div>
    </motion.div>
  )
}
