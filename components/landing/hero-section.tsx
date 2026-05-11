'use client'

import { motion } from 'motion/react'
import { ArrowRight, Blocks } from 'lucide-react'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { TypewriterEffect } from '@/components/ui/typewriter-effect'
import { Button } from '@/components/ui/button'

const heroWords = [
  { text: 'Accept' },
  { text: 'any' },
  { text: 'token.', className: 'text-primary' },
  { text: 'Receive' },
  { text: 'USDC.' },
]

// function scrollToSend() {
//   const section = document.getElementById('send-showcase')
//   if (!section) return
//   const sectionTop = section.getBoundingClientRect().top + window.scrollY
//   const paddingTop = parseFloat(getComputedStyle(section).paddingTop)
//   const vh = window.innerHeight
//   // ContainerScroll is h-[280vh] with offset ['start start','end end'].
//   // Full scroll range = 1.8vh. Card is flat at 72%; target 80% for margin.
//   window.scrollTo({ top: sectionTop + paddingTop + 0.8 * 1.8 * vh, behavior: 'smooth' })
// }

function scrollToSend() {
  const section = document.getElementById('send-showcase')
  const duration = 2000
  if (!section) return

  const sectionTop = section.getBoundingClientRect().top + window.scrollY
  const paddingTop = parseFloat(getComputedStyle(section).paddingTop)
  const vh = window.innerHeight

  const target = sectionTop + paddingTop + 0.8 * 1.8 * vh
  const start = window.scrollY
  const startTime = performance.now()

  function easeInOutQuad(t: number) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  }

  function animateScroll(currentTime: number) {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = easeInOutQuad(progress)

    window.scrollTo(0, start + (target - start) * eased)

    if (progress < 1) {
      requestAnimationFrame(animateScroll)
    }
  }

  requestAnimationFrame(animateScroll)
}

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
          Create a shareable payment link. Your buyers pay in SOL, BONK, or any token — you receive USDC instantly.
          Non-custodial. No middleman.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className='flex flex-col items-center gap-3 sm:flex-row'
        >
          <Button
            onClick={scrollToSend}
            className='inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-[opacity,transform] duration-100 hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
          >
            Try it
            <ArrowRight className='h-4 w-4' />
          </Button>

          <Button
            onClick={() => (window.location.href = '/dashboard')}
            className='inline-flex items-center gap-2 rounded-xl border border-border bg-background/50 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
          >
            <Blocks className='h-4 w-4' />
            Open App
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
