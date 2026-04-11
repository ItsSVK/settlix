'use client'

import { motion } from 'motion/react'
import { PlusCircle, Share2, Wallet } from 'lucide-react'

const steps = [
  {
    step: '01',
    icon: PlusCircle,
    title: 'Create your link',
    description: 'Connect your Solana wallet, set an amount, and generate your unique payment link in seconds.',
  },
  {
    step: '02',
    icon: Share2,
    title: 'Share anywhere',
    description: 'Drop the link in an invoice, tweet, DM, or embed it on your website. No sign-up required for buyers.',
  },
  {
    step: '03',
    icon: Wallet,
    title: 'Receive USDC',
    description: 'Buyers pay in any token. Jupiter swaps it on-chain. USDC hits your wallet instantly, every time.',
  },
]

export function HowItWorks() {
  return (
    <section className='mx-auto max-w-5xl px-6 py-24'>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className='mb-16 text-center'
      >
        <p className='mb-3 text-xs font-semibold uppercase tracking-widest text-primary'>How it works</p>
        <h2 className='text-4xl font-bold tracking-tight'>Three steps to your first payment</h2>
      </motion.div>

      <div className='grid gap-6 md:grid-cols-3'>
        {steps.map(({ step, icon: Icon, title, description }, i) => (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.15 }}
            viewport={{ once: true }}
            className='group relative rounded-2xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_30px_rgba(109,40,217,0.08)]'
          >
            <div className='mb-4 flex items-center justify-between'>
              <div className='flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/5'>
                <Icon className='h-5 w-5 text-primary' />
              </div>
              <span className='font-mono text-3xl font-bold text-border group-hover:text-primary/20 transition-colors'>
                {step}
              </span>
            </div>
            <h3 className='mb-2 font-semibold text-foreground'>{title}</h3>
            <p className='text-sm leading-relaxed text-muted-foreground'>{description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
