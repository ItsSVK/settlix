'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { HelpCircle, Plus } from 'lucide-react'

const faqs = [
  {
    q: 'What exactly is Settlix?',
    a: 'Settlix is a non-custodial crypto payments platform built on Solana. It lets merchants create payment links, invoices, and recurring subscriptions — your buyers pay in any Solana token, and you receive USDC directly in your wallet. No bank account, no intermediary, no custody.',
  },
  {
    q: 'What can I create on Settlix?',
    a: "Four things: shareable payment links (one-time or open-ended), professional invoices with due dates, recurring subscriptions with configurable billing cycles, and an embeddable checkout widget you can drop into any website with a single <script> tag. There's also a REST API if you want full programmatic control.",
  },
  {
    q: 'What tokens can my buyers pay with?',
    a: 'Any SPL token — SOL, BONK, JUP, WIF, USDT, and thousands more. Settlix uses Jupiter to find the best swap route at checkout, so buyers pay whatever they have and you receive the exact USDC amount you requested. No slippage risk on your end.',
  },
  {
    q: 'Do you ever hold my funds?',
    a: "Never. Every payment is an atomic on-chain transaction that goes directly from the buyer's wallet to yours. Settlix acts as the coordinator — it assembles the transaction, but your funds are never routed through or held by us at any point.",
  },
  {
    q: "What's the difference between a payment link, invoice, and subscription?",
    a: 'A payment link is a shareable URL for one-off or open-ended payments (great for products, donations, or tips). An invoice is a formal bill sent to a specific buyer with a due date and line items. A subscription automatically charges a recurring amount on a set schedule — weekly, monthly, etc. — using a pre-authorized relayer so no manual action is needed each cycle.',
  },
  {
    q: 'Can I embed checkout in my own website or app?',
    a: "Yes. Add one <script> tag from Settlix and call Settlix.open({ linkId }) — a clean modal checkout opens inline without redirecting your users. It works on any web stack. There's also a full REST API with API key auth for backend integrations.",
  },
  {
    q: 'Do I need to know how to code to use Settlix?',
    a: "Not at all. The dashboard lets you create payment links, invoices, and subscriptions in a few clicks with no code. The embeddable checkout and REST API are there if you want to go deeper, but they're entirely optional.",
  },
  {
    q: 'Are there any fees?',
    a: "Settlix charges no platform fee — you keep 100% of every payment. The only costs are standard Solana network transaction fees (fractions of a cent) and Jupiter's swap fee when a currency conversion is involved. There's no monthly subscription and no percentage cut.",
  },
]

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className='relative overflow-hidden bg-background px-6 py-24 md:py-32'>
      {/* Dot grid — visible in light mode, unlike SVG beam lines */}
      <div className='absolute inset-0 bg-[radial-gradient(circle,var(--border)_1.5px,transparent_1.5px)] bg-size-[28px_28px] opacity-60 dark:opacity-30 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black_20%,transparent_100%)]' />

      <div className='relative z-10 mx-auto max-w-3xl'>
        {/* Header */}
        <div className='mb-16 text-center'>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className='mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary shadow-[0_0_15px_rgba(var(--primary),0.2)]'
          >
            <HelpCircle className='h-4 w-4' />
            Common questions
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className='text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl'
          >
            Everything you need to know
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className='mx-auto mt-4 max-w-xl text-lg text-muted-foreground'
          >
            Still have questions? Reach out on{' '}
            <a
              href='https://x.com/ShouvikMohanta'
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary underline-offset-4 transition-all duration-200 hover:underline'
            >
              X / Twitter
            </a>
            .
          </motion.p>
        </div>

        {/* Single unified card — same pattern as FlowSection stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className='divide-y divide-border/50 overflow-hidden rounded-3xl border border-border/50 bg-card/70 shadow-lg shadow-primary/5 backdrop-blur-xl'
        >
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i
            return (
              <div
                key={i}
                className={`relative transition-colors duration-300 ${isOpen ? 'bg-primary/[0.04]' : 'hover:bg-muted/40'}`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className='flex w-full items-center justify-between gap-4 px-6 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'
                  aria-expanded={isOpen}
                >
                  <span
                    className={`text-sm font-semibold transition-colors duration-300 sm:text-base ${isOpen ? 'text-primary' : 'text-foreground'}`}
                  >
                    {faq.q}
                  </span>

                  <div
                    className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${isOpen ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border bg-transparent text-muted-foreground'}`}
                  >
                    <Plus
                      className={`h-3.5 w-3.5 transition-transform duration-300 ${isOpen ? 'rotate-45' : 'rotate-0'}`}
                    />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key='content'
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] }}
                      className='overflow-hidden'
                    >
                      <p className='px-6 pb-5 pt-1 text-sm leading-relaxed text-muted-foreground sm:text-base'>
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
