'use client'

import { motion, AnimatePresence } from 'motion/react'
import { X, GitFork } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DashboardLink } from '@/lib/hooks/use-dashboard'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

const SOLSCAN_CLUSTER = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet' ? '?cluster=devnet' : ''

function shorten(s: string, start = 6, end = 4) {
  return `${s.slice(0, start)}…${s.slice(-end)}`
}

interface SplitModalProps {
  open: boolean
  onClose: () => void
  link: DashboardLink
}

export function SplitModal({ open, onClose, link }: SplitModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const content = (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key='split-backdrop'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className='fixed inset-0 z-100 bg-black/60 backdrop-blur-sm'
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key='split-panel'
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className='fixed left-1/2 top-1/2 z-100 w-[min(380px,90vw)] -translate-x-1/2 -translate-y-1/2'
          >
            <div className='relative rounded-2xl border border-border/50 bg-card/95 p-6 shadow-[0_32px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl'>
              {/* Close */}
              <Button
                onClick={onClose}
                className='absolute right-4 top-4 rounded-full w-8 h-8 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
                aria-label='Close split modal'
                variant={'ghost'}
              >
                <X className='h-4 w-4' />
              </Button>

              {/* Header */}
              <div className='mb-6 flex items-center gap-2'>
                <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10'>
                  <GitFork className='h-4 w-4 text-primary' />
                </div>
                <div>
                  <p className='text-sm font-semibold text-foreground'>Revenue Split</p>
                  <p className='text-xs text-muted-foreground'>Payouts are shared automatically</p>
                </div>
              </div>

              {/* Recipients list */}
              <div className='space-y-2'>
                {link.recipients.map((r, i) => (
                  <div
                    key={i}
                    className='flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/10 px-3 py-2.5 text-sm'
                  >
                    <a
                      href={`https://solscan.io/account/${r.wallet}${SOLSCAN_CLUSTER}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='flex-1 font-mono text-muted-foreground hover:text-foreground transition-colors truncate block'
                      title={r.wallet}
                    >
                      {r.wallet === link.merchantWallet ? `${shorten(r.wallet, 8, 8)} (you)` : shorten(r.wallet, 8, 8)}
                    </a>
                    <span className='font-semibold text-foreground tabular-nums'>
                      {(r.basisPoints / 100).toFixed(2).replace(/\.?0+$/, '')}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  if (!mounted) return null
  return createPortal(content, document.body)
}
