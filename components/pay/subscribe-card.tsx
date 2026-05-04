'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CheckCircle, ExternalLink, Mail, RefreshCw, User } from 'lucide-react'
import Image from 'next/image'
import { SubscribeButton } from './subscribe-button'
import type { SubscribeResult } from '@/lib/hooks/use-subscription-flow'
import { SOLSCAN_CLUSTER } from '@/lib/solana/constants'

const INTERVAL_LABELS: Record<string, string> = {
  weekly: 'week',
  monthly: 'month',
  yearly: 'year',
}

export interface PlanData {
  id: string
  merchantWallet: string
  title: string | null
  description: string | null
  amount: string
  token: string
  tokenSymbol: string
  tokenLogo: string | null
  interval: string
  active: boolean
}

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function SuccessState({
  result,
  amount,
  tokenSymbol,
  interval,
}: {
  result: SubscribeResult
  amount: string
  tokenSymbol: string
  interval: string
}) {
  const periodEnd = new Date(result.currentPeriodEnd)
  const explorerUrl = `https://solscan.io/tx/${result.txSignature}${SOLSCAN_CLUSTER}`

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className='flex flex-col items-center gap-5 py-4 text-center'
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 18 }}
      >
        <CheckCircle className='h-14 w-14 text-green-500' strokeWidth={1.5} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <h3 className='text-xl font-bold text-foreground'>Subscribed!</h3>
        <p className='mt-1 text-sm text-muted-foreground'>Your subscription is active</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className='w-full rounded-xl border border-border/30 bg-muted/20 divide-y divide-border/30 text-left'
      >
        <div className='flex items-center justify-between px-4 py-2.5'>
          <span className='text-xs text-muted-foreground'>Amount</span>
          <span className='text-sm font-semibold text-foreground'>
            {Number(amount).toFixed(2)}{' '}
            <span className='font-normal text-muted-foreground'>
              {tokenSymbol} / {INTERVAL_LABELS[interval] ?? interval}
            </span>
          </span>
        </div>
        <div className='flex items-center justify-between px-4 py-2.5'>
          <span className='text-xs text-muted-foreground'>Next billing</span>
          <span className='text-sm font-semibold text-foreground'>
            {periodEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className='flex w-full flex-col gap-2'
      >
        <a
          href={`/manage/${result.id}`}
          className='flex w-full items-center justify-center gap-1.5 rounded-xl border border-border/50 px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground'
        >
          Manage / cancel subscription
        </a>
        <a
          href={explorerUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='flex items-center justify-center gap-1.5 rounded-lg px-4 py-1.5 text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground'
        >
          View on Solscan
          <ExternalLink className='h-3 w-3' />
        </a>
      </motion.div>
    </motion.div>
  )
}

export function SubscribeCard({ plan }: { plan: PlanData | null }) {
  const [result, setResult] = useState<SubscribeResult | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  const body = (() => {
    if (!plan) {
      return (
        <motion.div
          key='not-found'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className='py-10 text-center space-y-2'
        >
          <p className='text-2xl'>🔍</p>
          <p className='text-sm font-medium text-foreground'>Subscription plan not found</p>
          <p className='text-xs text-muted-foreground'>This link may be invalid or the plan may have been removed.</p>
        </motion.div>
      )
    }

    if (result) {
      return (
        <motion.div key='success' initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <SuccessState result={result} amount={plan.amount} tokenSymbol={plan.tokenSymbol} interval={plan.interval} />
        </motion.div>
      )
    }

    if (!plan.active) {
      return (
        <motion.div
          key='inactive'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className='py-10 text-center space-y-2'
        >
          <p className='text-2xl'>⏸️</p>
          <p className='text-sm font-medium text-foreground'>This plan is currently paused</p>
          <p className='text-xs text-muted-foreground'>The merchant has temporarily disabled new subscriptions.</p>
        </motion.div>
      )
    }

    return (
      <motion.div key='form' className='space-y-4'>
        <div className='rounded-xl border border-border/30 bg-muted/20 p-4 text-center'>
          <p className='text-xs text-muted-foreground'>
            Billed every {INTERVAL_LABELS[plan.interval] ?? plan.interval}
          </p>
          <div className='mt-1 flex items-baseline justify-center gap-2'>
            {plan.tokenLogo && <Image src={plan.tokenLogo} alt='' width={24} height={24} className='mb-1' />}
            <p className='text-4xl font-bold tracking-tight text-foreground'>{Number(plan.amount).toFixed(2)}</p>
          </div>
          <div className='mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground'>
            <RefreshCw className='h-3.5 w-3.5' />
            <span>
              {plan.tokenSymbol} / {INTERVAL_LABELS[plan.interval] ?? plan.interval}
            </span>
          </div>
        </div>

        {/* Name + email */}
        <div className='space-y-2'>
          <div className='relative'>
            <User className='pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50' />
            <input
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Your name (optional)'
              maxLength={100}
              className='w-full rounded-xl border border-border/40 bg-muted/30 py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-1 focus:ring-primary/20'
            />
          </div>
          <div className='relative'>
            <Mail className='pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50' />
            <input
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='Email for renewal alerts (optional)'
              className='w-full rounded-xl border border-border/40 bg-muted/30 py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-1 focus:ring-primary/20'
            />
          </div>
        </div>

        <SubscribeButton
          planId={plan.id}
          onSuccess={setResult}
          meta={{ subscriberName: name.trim() || undefined, subscriberEmail: email.trim() || undefined }}
        />
      </motion.div>
    )
  })()

  return (
    <div className='flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12'>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className='w-full max-w-sm'
      >
        <div className='rounded-2xl border border-border/50 bg-card/80 p-6 shadow-2xl backdrop-blur-sm'>
          {/* Header */}
          <div className='mb-6 flex flex-col items-center text-center'>
            <div className='mb-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1'>
              <p className='text-[10px] font-medium uppercase tracking-widest text-indigo-500 dark:text-indigo-400'>
                Recurring Subscription
              </p>
            </div>

            {plan?.title && <h1 className='mt-2 text-2xl font-bold tracking-tight text-foreground'>{plan.title}</h1>}

            {plan?.description && (
              <p className='mt-2 max-w-[280px] text-sm text-muted-foreground leading-relaxed'>{plan.description}</p>
            )}

            {plan && (
              <div className='mt-4 flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-1.5 border border-border/40'>
                <div className='h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' />
                <p className='font-mono text-xs font-medium text-muted-foreground'>{shorten(plan.merchantWallet)}</p>
              </div>
            )}

            <div className='mx-auto mt-2 h-px w-48 bg-linear-to-r from-transparent via-border to-transparent' />
          </div>

          <AnimatePresence mode='wait'>{body}</AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
