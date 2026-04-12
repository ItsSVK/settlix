'use client'

import { motion } from 'motion/react'
import { ArrowDown } from 'lucide-react'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { TypewriterEffect } from '@/components/ui/typewriter-effect'
import { MovingBorder } from '@/components/ui/moving-border'
import { ConnectButton } from '@/components/auth/connect-button'

const heroWords = [
  { text: 'Accept' },
  { text: 'any' },
  { text: 'token.', className: 'text-primary' },
  { text: 'Receive' },
  { text: 'USDC.' },
]

export function HeroSection() {
  return (
    <section className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 text-center'>
      <BackgroundBeams />

      <div className='relative z-10 flex flex-col items-center gap-8'>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary'
        >
          <span className='relative flex h-2 w-2'>
            <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75' />
            <span className='relative inline-flex h-2 w-2 rounded-full bg-primary' />
          </span>
          Powered by Jupiter &amp; Solana
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className='max-w-3xl text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl'
        >
          <TypewriterEffect words={heroWords} />
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className='max-w-xl text-lg text-muted-foreground'
        >
          Create a shareable payment link. Your buyers pay in SOL, BONK, or any token — you always receive USDC.
          Non-custodial. No middleman.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className='flex flex-col items-center gap-4 sm:flex-row'
        >
          <MovingBorder
            containerClassName='rounded-xl'
            className='px-8 py-3 text-sm font-semibold text-foreground'
            duration={2500}
            as='div'
          >
            <ConnectButton className='border-0 bg-transparent hover:bg-transparent hover:shadow-none p-0 text-foreground font-semibold' />
          </MovingBorder>

          <a
            href='#features'
            className='text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline'
          >
            Learn how it works ↓
          </a>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className='absolute bottom-10 flex flex-col items-center gap-2 text-xs text-muted-foreground'
      >
        <ArrowDown className='h-4 w-4 animate-bounce' />
        Scroll to explore
      </motion.div>
    </section>
  )
}
