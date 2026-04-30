'use client'

import { motion } from 'motion/react'
import { Wallet, Zap, CheckCircle2, ShieldCheck, ArrowRightLeft } from 'lucide-react'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { MovingBorder } from '@/components/ui/moving-border'

function FlowLine({ color = 'primary', delay = 0 }: { color?: 'primary' | 'emerald'; delay?: number }) {
  const viaMap = {
    primary: 'via-primary',
    emerald: 'via-emerald-400',
  }

  return (
    <>
      {/* Desktop horizontal line */}
      <div className='relative mx-4 hidden h-[2px] flex-1 overflow-hidden rounded-full lg:block'>
        <div className='absolute inset-0 bg-border/30' />
        <motion.div
          className={`absolute inset-0 bg-linear-to-r from-transparent ${viaMap[color]} to-transparent blur-[2px]`}
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, delay, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.2 }}
        />
        <motion.div
          className={`absolute inset-0 bg-linear-to-r from-transparent ${viaMap[color]} to-transparent`}
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, delay, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.2 }}
        />
      </div>

      {/* Mobile vertical line */}
      <div className='relative my-4 h-16 w-[2px] self-center overflow-hidden rounded-full lg:hidden'>
        <div className='absolute inset-0 bg-border/30' />
        <motion.div
          className={`absolute inset-0 bg-linear-to-b from-transparent ${viaMap[color]} to-transparent blur-[2px]`}
          animate={{ y: ['-100%', '200%'] }}
          transition={{ duration: 2, delay, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.2 }}
        />
        <motion.div
          className={`absolute inset-0 bg-linear-to-b from-transparent ${viaMap[color]} to-transparent`}
          animate={{ y: ['-100%', '200%'] }}
          transition={{ duration: 2, delay, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.2 }}
        />
      </div>
    </>
  )
}

const stats = [
  { value: '$0', label: 'Held by Settlix', note: 'Non-custodial' },
  { value: '100%', label: 'On-chain execution', note: 'Trustless' },
  { value: 'Best', label: 'Swap routes', note: 'via Jupiter' },
]

export function FlowSection() {
  return (
    <section className='relative overflow-hidden bg-background px-6 py-24 md:py-32'>
      <div className='absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[40px_40px] opacity-[0.04]' />
      <BackgroundBeams className='opacity-60 dark:opacity-40' />

      <div className='relative z-10 mx-auto max-w-5xl'>
        {/* Header */}
        <div className='mb-20 text-center'>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className='mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-500 shadow-[0_0_15px_rgba(52,211,153,0.15)] backdrop-blur-md'
          >
            <ShieldCheck className='h-4 w-4' />
            Non-custodial by design
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className='text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl'
          >
            Funds flow directly.
            <br />
            <span className='text-muted-foreground'>We never touch a token.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className='mx-auto mt-6 max-w-2xl text-lg text-muted-foreground'
          >
            Every transfer is an atomic on-chain swap routed by Jupiter. Settlix is simply the coordinator — ensuring
            smooth execution without ever taking custody of your funds.
          </motion.p>
        </div>

        {/* Flow diagram */}
        <div className='relative flex flex-col items-center justify-center lg:flex-row'>
          {/* Node: Buyer */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, type: 'spring', bounce: 0.4 }}
            className='relative z-10 flex w-full max-w-[260px] flex-col items-center gap-4 rounded-3xl border border-border/50 bg-card/40 p-6 shadow-2xl backdrop-blur-xl'
          >
            <div className='absolute inset-0 rounded-3xl bg-linear-to-br from-primary/10 to-transparent opacity-50' />
            <div className='relative flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-[0_0_30px_rgba(var(--primary),0.2)]'>
              <Wallet className='h-8 w-8' />
            </div>
            <div className='relative z-10 text-center'>
              <h3 className='text-lg font-semibold text-foreground'>Buyer Wallet</h3>
              <p className='mt-1 text-sm text-muted-foreground'>Any Solana token</p>
            </div>
            <div className='relative z-10 mt-2 flex flex-wrap justify-center gap-2'>
              {['SOL', 'USDC', 'BONK'].map((t) => (
                <span
                  key={t}
                  className='rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 font-mono text-[11px] font-medium text-primary'
                >
                  {t}
                </span>
              ))}
            </div>
          </motion.div>

          <FlowLine color='primary' delay={0} />

          {/* Node: Jupiter */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className='z-20 w-full max-w-[280px] lg:-mt-12'
          >
            <MovingBorder
              duration={3500}
              containerClassName='w-full shadow-2xl bg-border/20'
              className='flex flex-col items-center gap-4 bg-card/80 p-6 backdrop-blur-xl border border-border/50'
            >
              <div className='relative flex h-20 w-20 items-center justify-center rounded-3xl border border-sky-500/30 bg-sky-500/10 text-sky-400 shadow-[0_0_40px_rgba(56,189,248,0.25)]'>
                <Zap className='h-10 w-10' />
                <motion.div
                  className='absolute inset-0 rounded-3xl border-2 border-sky-400/40'
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
              <div className='text-center'>
                <h3 className='text-xl font-bold text-foreground'>Jupiter Route</h3>
                <p className='mt-1 text-sm text-muted-foreground'>Best-price atomic swap</p>
              </div>
              <div className='inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-400'>
                <ArrowRightLeft className='h-3.5 w-3.5' />
                Trustless Execution
              </div>
            </MovingBorder>
          </motion.div>

          <FlowLine color='emerald' delay={0.3} />

          {/* Node: Receiver */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4, type: 'spring', bounce: 0.4 }}
            className='relative z-10 flex w-full max-w-[260px] flex-col items-center gap-4 rounded-3xl border border-border/50 bg-card/40 p-6 shadow-2xl backdrop-blur-xl'
          >
            <div className='absolute inset-0 rounded-3xl bg-linear-to-bl from-emerald-500/10 to-transparent opacity-50' />
            <div className='relative flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.2)]'>
              <CheckCircle2 className='h-8 w-8' />
            </div>
            <div className='relative z-10 text-center'>
              <h3 className='text-lg font-semibold text-foreground'>Your Wallet</h3>
              <p className='mt-1 text-sm text-muted-foreground'>Always receives USDC</p>
            </div>
            <div className='relative z-10 mt-2 flex items-baseline gap-1.5'>
              <span className='font-mono text-3xl font-bold text-foreground'>125.00</span>
              <span className='font-mono text-sm font-semibold text-emerald-400'>USDC</span>
            </div>
          </motion.div>
        </div>

        {/* Settlix coordinator callout */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.7 }}
          className='mt-12 flex justify-center'
        >
          <div className='inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/50 px-5 py-3 text-sm text-muted-foreground shadow-lg backdrop-blur-md'>
            <div className='flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary'>
              <ShieldCheck className='h-3.5 w-3.5' />
            </div>
            <span className='font-semibold text-foreground'>Settlix</span>
            never holds, routes, or custodies your funds.
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className='mt-16 grid grid-cols-1 divide-y divide-border/40 rounded-3xl border border-border/50 bg-card/40 shadow-lg backdrop-blur-md md:grid-cols-3 md:divide-x md:divide-y-0'
        >
          {stats.map((stat) => (
            <div key={stat.label} className='flex flex-col items-center justify-center p-8 text-center'>
              <span className='text-4xl font-extrabold tracking-tight text-foreground'>{stat.value}</span>
              <span className='mt-3 text-base font-medium text-foreground/90'>{stat.label}</span>
              <span className='mt-1.5 rounded-full border border-border/50 bg-background/50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground shadow-sm'>
                {stat.note}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
