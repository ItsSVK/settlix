'use client'

import { motion, useReducedMotion } from 'motion/react'
import { Link2, FileText, RefreshCw, Code2, GitBranch, Globe, LayoutGrid } from 'lucide-react'
import { BackgroundBeams } from '@/components/ui/background-beams'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const features: {
  icon: LucideIcon
  label: string
  description: string
  colorKey: string
}[] = [
  {
    icon: Link2,
    label: 'Payment Links',
    description: 'Generate shareable links instantly. Buyers pay any token, you settle in USDC.',
    colorKey: 'primary',
  },
  {
    icon: FileText,
    label: 'Invoices',
    description: 'Issue professional crypto invoices with line items and a direct checkout link.',
    colorKey: 'sky',
  },
  {
    icon: RefreshCw,
    label: 'Subscriptions',
    description: 'Automated recurring billing. Users authorize once, relayer handles the rest.',
    colorKey: 'violet',
  },
  {
    icon: Code2,
    label: 'Embeddable Widget',
    description: 'Drop a script tag anywhere for a full inline checkout modal. No redirects.',
    colorKey: 'emerald',
  },
  {
    icon: GitBranch,
    label: 'Split Payments',
    description: 'Route revenue to multiple wallets by basis points. Splits occur directly on-chain.',
    colorKey: 'amber',
  },
  {
    icon: Globe,
    label: 'REST API & Webhooks',
    description: 'Complete headless control with API keys, HMAC webhooks, and programmatic links.',
    colorKey: 'rose',
  },
]

const colorConfig = {
  primary: {
    iconBorder: 'border-primary/20',
    iconBg: 'bg-primary/10',
    iconText: 'text-primary',
    shadow: 'shadow-[0_0_20px_rgba(var(--primary),0.1)]',
  },
  sky: {
    iconBorder: 'border-sky-500/20',
    iconBg: 'bg-sky-500/10',
    iconText: 'text-sky-400',
    shadow: 'shadow-[0_0_20px_rgba(56,189,248,0.1)]',
  },
  violet: {
    iconBorder: 'border-violet-500/20',
    iconBg: 'bg-violet-500/10',
    iconText: 'text-violet-400',
    shadow: 'shadow-[0_0_20px_rgba(139,92,246,0.1)]',
  },
  emerald: {
    iconBorder: 'border-emerald-500/20',
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-400',
    shadow: 'shadow-[0_0_20px_rgba(52,211,153,0.1)]',
  },
  amber: {
    iconBorder: 'border-amber-500/20',
    iconBg: 'bg-amber-500/10',
    iconText: 'text-amber-400',
    shadow: 'shadow-[0_0_20px_rgba(251,191,36,0.1)]',
  },
  rose: {
    iconBorder: 'border-rose-500/20',
    iconBg: 'bg-rose-500/10',
    iconText: 'text-rose-400',
    shadow: 'shadow-[0_0_20px_rgba(244,63,94,0.1)]',
  },
}

function FeatureCard({ feature, reduceMotion }: { feature: (typeof features)[0]; reduceMotion: boolean }) {
  const config = colorConfig[feature.colorKey as keyof typeof colorConfig]

  return (
    <motion.div
      variants={{
        hidden: reduceMotion ? { opacity: 1 } : { opacity: 0, y: 24, scale: 0.96 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: reduceMotion ? { duration: 0 } : { duration: 0.4, ease: 'easeOut' },
        },
      }}
      className='group relative z-10 flex h-full w-full flex-col items-center overflow-hidden rounded-3xl border border-border/60 bg-card/40 p-6 shadow-2xl backdrop-blur-xl transition-[border-color,background-color,box-shadow] duration-300 ease-out hover:border-border hover:bg-card/60 hover:shadow-[0_18px_50px_rgba(0,0,0,0.12)] dark:border-border/50 dark:bg-card/45 dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] dark:hover:bg-card/65 sm:p-8'
    >
      <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100' />

      {/* Icon Container - Clean, minimal glow */}
      <div
        className={cn(
          'relative mb-6 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:group-hover:scale-110',
          config.iconBorder,
          config.iconBg,
          config.iconText,
          config.shadow,
        )}
      >
        <feature.icon className='h-7 w-7' />
      </div>

      {/* Centered Content */}
      <div className='relative z-10 text-center'>
        <h3 className='text-lg font-bold text-foreground'>{feature.label}</h3>
        <p className='mt-2 text-sm leading-relaxed text-muted-foreground opacity-90'>{feature.description}</p>
      </div>
    </motion.div>
  )
}

export function FeaturesSection() {
  const prefersReducedMotion = useReducedMotion()
  const reduceMotion = Boolean(prefersReducedMotion)

  return (
    <section className='relative overflow-hidden bg-background px-6 py-24 md:py-32'>
      <div className='absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[40px_40px] opacity-[0.04]' />
      <BackgroundBeams className='opacity-60 dark:opacity-40' />

      <div className='relative z-10 mx-auto max-w-6xl'>
        {/* Header */}
        <div className='mb-20 text-center'>
          <motion.div
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={reduceMotion ? { duration: 0 } : undefined}
            className='mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary shadow-[0_0_15px_rgba(var(--primary),0.15)] backdrop-blur-md'
          >
            <LayoutGrid className='h-4 w-4' />
            Full product suite
          </motion.div>

          <motion.h2
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={reduceMotion ? { duration: 0 } : { delay: 0.1 }}
            className='text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl'
          >
            One platform.
            <br />
            <span className='text-muted-foreground'>Every way to get paid.</span>
          </motion.h2>

          <motion.p
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={reduceMotion ? { duration: 0 } : { delay: 0.2 }}
            className='mx-auto mt-6 max-w-2xl text-lg text-muted-foreground'
          >
            From a one-off payment link to fully automated subscriptions <br />
            all non-custodial, all settling in USDC.
          </motion.p>
        </div>

        {/* Minimalist Feature grid */}
        <motion.div
          initial='hidden'
          whileInView='visible'
          viewport={{ once: true, margin: '-80px' }}
          variants={{
            hidden: {},
            visible: {
              transition: reduceMotion ? { duration: 0 } : { staggerChildren: 0.08, delayChildren: 0.12 },
            },
          }}
          className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'
        >
          {features.map((feature) => (
            <FeatureCard key={feature.label} feature={feature} reduceMotion={reduceMotion} />
          ))}
        </motion.div>

        {/* Bottom callout */}
        <motion.div
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={reduceMotion ? { duration: 0 } : { delay: 0.55 }}
          className='mt-16 flex justify-center'
        >
          <div className='inline-flex items-center gap-3 rounded-2xl border border-border/40 bg-card/40 px-6 py-4 text-sm text-muted-foreground shadow-sm backdrop-blur-md transition-colors duration-300 ease-out hover:border-border/60'>
            <div className='flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary'>
              <span className='font-bold'>0%</span>
            </div>
            <span>
              <span className='font-semibold text-foreground'>Platform fee. </span>
              You keep 100% of every payment.
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
