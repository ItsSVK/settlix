'use client'

import { motion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import type { RecentTransaction } from '@/lib/hooks/use-dashboard-stats'

function timeAgo(isoDate: string) {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function shortWallet(wallet: string) {
  return `${wallet.slice(0, 4)}…${wallet.slice(-4)}`
}

interface RecentTransactionsProps {
  data: RecentTransaction[]
  loading?: boolean
}

export function RecentTransactions({ data, loading = false }: RecentTransactionsProps) {
  if (loading) {
    return (
      <div className='rounded-2xl border border-border/50 bg-background/50 p-6 backdrop-blur-xl shadow-sm'>
        <div className='mb-5 h-5 w-40 rounded-md bg-muted animate-pulse' />
        <div className='space-y-3'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className='flex items-center gap-3'>
              <div className='h-9 w-9 rounded-full bg-muted animate-pulse' />
              <div className='flex-1 space-y-1.5'>
                <div className='h-3.5 w-32 rounded bg-muted animate-pulse' />
                <div className='h-3 w-20 rounded bg-muted animate-pulse' />
              </div>
              <div className='h-4 w-16 rounded bg-muted animate-pulse' />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6, ease: 'easeOut' }}
      className='rounded-2xl border border-border/50 bg-background/50 p-6 backdrop-blur-xl shadow-sm'
    >
      <div className='mb-5 flex items-center justify-between'>
        <h2 className='text-lg font-semibold text-foreground'>Recent Transactions</h2>
        <span className='text-xs text-muted-foreground'>Last {data.length} paid</span>
      </div>

      {data.length === 0 ? (
        <div className='flex h-[180px] items-center justify-center'>
          <p className='text-sm text-muted-foreground'>No transactions yet</p>
        </div>
      ) : (
        <div className='space-y-1'>
          {data.map((tx) => (
            <a
              key={tx.id}
              href={`https://solscan.io/tx/${tx.txSignature}`}
              target='_blank'
              rel='noopener noreferrer'
              className='group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/40'
            >
              <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary'>
                {shortWallet(tx.userWallet).slice(0, 2)}
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium text-foreground truncate'>{tx.linkTitle ?? 'Payment Link'}</p>
                <p className='text-xs text-muted-foreground'>
                  {shortWallet(tx.userWallet)} · {timeAgo(tx.createdAt)}
                </p>
              </div>
              <div className='flex items-center gap-1 shrink-0'>
                <span className='text-sm font-semibold text-foreground'>
                  ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <ArrowUpRight className='h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100' />
              </div>
            </a>
          ))}
        </div>
      )}
    </motion.div>
  )
}
