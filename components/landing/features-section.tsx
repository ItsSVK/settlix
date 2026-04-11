'use client'

import { motion } from 'motion/react'
import { Coins, Zap, Link2 } from 'lucide-react'
import { StickyScrollReveal } from '@/components/ui/sticky-scroll-reveal'

const FeatureVisual = ({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) => (
  <div
    className={`flex h-full w-full flex-col items-center justify-center gap-4 rounded-2xl border border-border/40 bg-muted/30 p-6`}
  >
    <div className={`rounded-2xl border border-border/60 bg-background p-5`}>
      <Icon className={`h-10 w-10 ${color}`} strokeWidth={1.5} />
    </div>
    <span className='text-sm font-medium text-muted-foreground'>{label}</span>
  </div>
)

const features = [
  {
    title: 'Pay in any token',
    description:
      "Buyers choose any Solana token they hold — SOL, BONK, memecoins, whatever. Jupiter's routing engine finds the best swap path on-chain, atomically. No extra steps, no extra wallets.",
    content: <FeatureVisual icon={Coins} label='Jupiter-powered swap' color='text-primary' />,
  },
  {
    title: 'Receive USDC instantly',
    description:
      'The swap and settlement happen in a single transaction. USDC lands directly in your wallet the moment payment is confirmed, with no custodian or escrow in between.',
    content: <FeatureVisual icon={Zap} label='Instant USDC settlement' color='text-primary' />,
  },
  {
    title: 'One link, unlimited payments',
    description:
      'Create a fixed-amount payment link once. Share it anywhere — in an invoice, on your website, in a DM. Multiple buyers can pay the same link, all tracked in your dashboard.',
    content: <FeatureVisual icon={Link2} label='Shareable & reusable' color='text-primary' />,
  },
]

export function FeaturesSection() {
  return (
    <section id='features' className='mx-auto max-w-5xl px-6 py-28'>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className='mb-14 text-center'
      >
        <p className='mb-3 text-xs font-semibold uppercase tracking-widest text-primary'>Features</p>
        <h2 className='text-4xl font-bold tracking-tight'>Built for how crypto actually works</h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        viewport={{ once: true }}
      >
        <StickyScrollReveal content={features} />
      </motion.div>
    </section>
  )
}
