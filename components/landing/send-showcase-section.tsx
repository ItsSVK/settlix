'use client'

import React, { useRef } from 'react'
import { ContainerScroll } from '@/components/ui/container-scroll-animation'
import { SendCard } from '@/components/send/send-card'
import { ArrowRight, Blocks, CircleDollarSign, Coins, Route, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { motion, useScroll, useTransform } from 'motion/react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

const payerTokens = [
  { symbol: 'SOL', amount: '2.41', tone: 'bg-primary/10 text-primary' },
  { symbol: 'BONK', amount: '18.2M', tone: 'bg-emerald-500/10 text-emerald-500' },
  { symbol: 'JUP', amount: '742', tone: 'bg-sky-500/10 text-sky-500' },
]

const routeStats = [
  { label: 'Settlement', value: 'USDC' },
  { label: 'Custody', value: 'Never held' },
  { label: 'Route', value: 'Best price' },
]

export function SendShowcaseSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  })

  const y1 = useTransform(scrollYProgress, [0, 1], [0, -200])
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 150])
  const opacity = useTransform(scrollYProgress, [0.2, 0.5, 0.8], [0, 1, 0])

  return (
    <section ref={containerRef} id='send-showcase' className='relative overflow-x-clip bg-background pt-24 md:pt-32'>
      {/* Floating Background Elements */}
      <motion.div
        style={{ y: y1, opacity }}
        className='absolute left-[10%] top-[30%] -z-10 h-64 w-64 rounded-full bg-primary/20 blur-[100px]'
      />
      <motion.div
        style={{ y: y2, opacity }}
        className='absolute right-[10%] top-[50%] -z-10 h-64 w-64 rounded-full bg-emerald-500/20 blur-[100px]'
      />

      <motion.div style={{ y: y1 }} className='absolute left-[15%] top-[40%] text-primary/30 z-0'>
        <CircleDollarSign size={48} strokeWidth={1} />
      </motion.div>
      <motion.div style={{ y: y2 }} className='absolute right-[20%] top-[60%] text-emerald-500/30 z-0'>
        <Coins size={56} strokeWidth={1} />
      </motion.div>
      <motion.div style={{ y: y1 }} className='absolute left-[80%] top-[30%] text-primary/20 z-0'>
        <Route size={64} strokeWidth={1} />
      </motion.div>

      <ContainerScroll
        titleComponent={
          <div className='relative z-10 mx-auto flex max-w-4xl flex-col items-center justify-center space-y-4 md:space-y-5'>
            <div className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-medium text-primary shadow-[0_0_20px_rgba(var(--primary),0.2)] backdrop-blur-md md:text-sm'>
              <Sparkles className='h-4 w-4' aria-hidden='true' />
              The Star Feature
            </div>
            <h2 className='mt-2 text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl'>
              See it live. <br />
              <span className='bg-linear-to-b from-foreground to-muted-foreground bg-clip-text text-transparent'>
                Try a real checkout.
              </span>
            </h2>
            <p className='mx-auto max-w-2xl text-base leading-7 text-muted-foreground md:text-lg'>
              Set the amount in USDC, choose your wallet, and let the payer settle from any Solana token they hold. The
              best route is automatically found on-chain.
            </p>
          </div>
        }
      >
        <SettlementSurface />
      </ContainerScroll>
    </section>
  )
}

function SettlementSurface() {
  const router = useRouter()
  return (
    <div className='relative flex flex-col h-full w-full items-center justify-center overflow-hidden bg-background px-4 py-6 md:px-8'>
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,var(--primary)_0,transparent_30%),radial-gradient(circle_at_78%_68%,rgb(16_185_129)_0,transparent_24%)] opacity-[0.08]' />
      <div className='absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[56px_56px] opacity-[0.08]' />

      <div className='absolute left-4 top-4 right-4 flex items-center justify-between rounded-2xl border border-border/50 bg-background/80 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur-md md:left-8 md:right-8 md:top-8'>
        <span className='flex items-center gap-2 font-medium text-foreground'>
          <ShieldCheck className='h-4 w-4 text-emerald-500' aria-hidden='true' />
          Non-custodial checkout
        </span>
        <span className='hidden font-mono sm:inline'>Jupiter routed</span>
      </div>

      <div className='relative z-10 grid w-full max-w-6xl items-center gap-5 lg:grid-cols-[1fr_minmax(320px,420px)_1fr]'>
        <div className='hidden space-y-3 lg:block'>
          <p className='text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground'>Payer can use</p>
          <div className='space-y-3'>
            {payerTokens.map((token) => (
              <div
                key={token.symbol}
                className='flex items-center justify-between rounded-2xl border border-border/50 bg-card/70 p-4 shadow-sm backdrop-blur-md'
              >
                <div className='flex items-center gap-3'>
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl font-mono text-xs font-bold ${token.tone}`}
                  >
                    {token.symbol}
                  </span>
                  <div>
                    <p className='text-sm font-semibold text-foreground'>{token.symbol}</p>
                    <p className='text-xs text-muted-foreground'>Wallet balance</p>
                  </div>
                </div>
                <span className='font-mono text-sm text-muted-foreground'>{token.amount}</span>
              </div>
            ))}
          </div>
        </div>

        <div className='relative mx-auto w-full max-w-md'>
          <div className='absolute -left-24 top-1/2 hidden h-px w-24 bg-linear-to-r from-transparent to-primary/60 lg:block' />
          <div className='absolute -right-24 top-1/2 hidden h-px w-24 bg-linear-to-r from-emerald-500/60 to-transparent lg:block' />
          <div className='absolute -left-28 top-[calc(50%-18px)] hidden h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-background text-primary shadow-sm lg:flex'>
            <ArrowRight className='h-4 w-4' aria-hidden='true' />
          </div>
          <div className='absolute -right-28 top-[calc(50%-18px)] hidden h-9 w-9 items-center justify-center rounded-full border border-emerald-500/30 bg-background text-emerald-500 shadow-sm lg:flex'>
            <Zap className='h-4 w-4' aria-hidden='true' />
          </div>
          <div className='mb-3 flex justify-center'>
            <span className='inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-500'>
              <span className='relative flex h-1.5 w-1.5'>
                <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75' />
                <span className='relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500' />
              </span>
              Live — real transfers
            </span>
          </div>
          <SendCard variant='embedded' />
        </div>

        <div className='hidden space-y-3 lg:block'>
          <p className='text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground'>Receiver gets</p>
          <div className='rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5 shadow-sm backdrop-blur-md'>
            <p className='text-sm text-muted-foreground'>Settled amount</p>
            <div className='mt-3 flex items-baseline gap-2'>
              <span className='font-mono text-4xl font-bold tracking-tight text-foreground'>125.00</span>
              <span className='font-mono text-sm font-semibold text-emerald-500'>USDC</span>
            </div>
            <div className='mt-5 grid gap-2'>
              {routeStats.map((stat) => (
                <div key={stat.label} className='flex items-center justify-between text-xs'>
                  <span className='text-muted-foreground'>{stat.label}</span>
                  <span className='font-medium text-foreground'>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className='relative z-10 mt-16 flex flex-col items-center gap-4'>
        <p className='text-sm font-medium text-muted-foreground'>Explore everything we&apos;ve built</p>
        <Button
          onClick={() => router.push('/dashboard')}
          className='group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all hover:scale-105 active:scale-95'
        >
          <Blocks className='h-4 w-4' />
          <span>Open the App</span>
          <ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-1' />
        </Button>
      </div>

      <div className='absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2 md:bottom-8 md:left-8 md:right-8 lg:hidden'>
        {routeStats.map((stat) => (
          <div
            key={stat.label}
            className='rounded-2xl border border-border/50 bg-card/70 p-3 text-center backdrop-blur-md'
          >
            <p className='truncate text-xs text-muted-foreground'>{stat.label}</p>
            <p className='mt-1 truncate text-xs font-semibold text-foreground'>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
