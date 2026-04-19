'use client'

const SOLSCAN_CLUSTER = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet' ? '?cluster=devnet' : ''

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, Copy, Check, ExternalLink, ToggleLeft, ToggleRight, QrCode } from 'lucide-react'
import type { DashboardLink } from '@/lib/hooks/use-dashboard'
import { Button } from '@/components/ui/button'
import { copyText } from '@/lib/utils'
import { QRModal } from './qr-modal'

function shorten(s: string, start = 6, end = 4) {
  return `${s.slice(0, start)}…${s.slice(-end)}`
}

interface LinkRowProps {
  link: DashboardLink
  onToggle: (id: string, active: boolean) => Promise<void>
}

export function LinkRow({ link, onToggle }: LinkRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [qrOpen, setQROpen] = useState(false)

  const payUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/pay/${link.id}`

  const handleToggle = async () => {
    setToggling(true)
    try {
      await onToggle(link.id, !link.active)
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className='rounded-xl border border-border/40 bg-card shadow-[0_6px_16px_rgba(15,23,42,0.06)] dark:shadow-none transition-all hover:border-border/70 hover:shadow-[0_10px_24px_rgba(15,23,42,0.1)] dark:hover:shadow-none'>
      {/* Main row */}
      <div className='flex cursor-pointer items-center gap-3 p-4' onClick={() => setExpanded((v) => !v)}>
        {/* Status dot */}
        <span className={`h-2 w-2 shrink-0 rounded-full ${link.active ? 'bg-green-500' : 'bg-muted-foreground'}`} />

        {/* ID */}
        <span className='hidden font-mono text-xs text-muted-foreground sm:block'>{shorten(link.id, 8, 6)}</span>

        {/* Amount */}
        <span className='flex-1 text-sm font-semibold text-foreground'>{Number(link.amount).toFixed(2)} USDC</span>

        {/* Stats */}
        <div className='hidden items-center gap-4 sm:flex'>
          <span className='text-xs text-muted-foreground'>
            <span className='font-semibold text-foreground'>{link.stats.paidCount}</span> paid
          </span>
          <span className='text-xs text-muted-foreground'>
            <span className='font-semibold text-foreground'>{link.stats.failedCount}</span> failed
          </span>
          {link.stats.successRate !== null && (
            <span className='text-xs text-muted-foreground'>
              <span className='font-semibold text-foreground'>{link.stats.successRate}%</span> success
            </span>
          )}
        </div>

        {/* Actions */}
        <div className='flex items-center' onClick={(e) => e.stopPropagation()}>
          {/* QR Code */}
          <Button
            onClick={() => setQROpen(true)}
            title='Show QR code'
            variant='ghost'
            size='xss'
            className='text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
          >
            <QrCode />
          </Button>

          {/* Copy */}
          <Button
            onClick={() => copyText(payUrl, setCopied)}
            title='Copy pay URL'
            variant='ghost'
            size='xss'
            className='text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
          >
            {copied ? <Check className='text-green-500' /> : <Copy />}
          </Button>

          {/* Open pay page */}
          <Button
            onClick={() => {
              window.open(payUrl, '_blank')
            }}
            title='Open pay page'
            variant='ghost'
            size='xss'
            className='text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
          >
            <ExternalLink />
          </Button>

          {/* Toggle active */}
          <Button
            onClick={handleToggle}
            disabled={toggling}
            title={link.active ? 'Deactivate' : 'Activate'}
            variant='ghost'
            size='xss'
            className='text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
          >
            {link.active ? <ToggleRight className='text-green-500' /> : <ToggleLeft />}
          </Button>
        </div>

        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Expanded executions */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className='overflow-hidden'
          >
            <div className='border-t border-border/30 px-4 pb-4 pt-3'>
              {link.recentExecutions.length === 0 ? (
                <p className='text-center text-xs text-muted-foreground py-3'>No payments yet</p>
              ) : (
                <div className='space-y-2'>
                  <p className='mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground'>
                    Recent payments
                  </p>
                  {link.recentExecutions.map((ex) => (
                    <div key={ex.id} className='flex items-center gap-3 rounded-lg bg-muted/20 px-3 py-2 text-xs'>
                      <span
                        className={`h-1.5 w-1.5 rounded-full shrink-0 ${ex.status === 'paid' ? 'bg-green-500' : 'bg-destructive'}`}
                      />
                      {ex.userWallet ? (
                        <a
                          href={`https://solscan.io/account/${ex.userWallet}${SOLSCAN_CLUSTER}`}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='flex-1 font-mono text-muted-foreground hover:text-foreground transition-colors'
                        >
                          {shorten(ex.userWallet)}
                        </a>
                      ) : (
                        <span className='flex-1 font-mono text-muted-foreground'>???</span>
                      )}
                      <span className='font-semibold text-foreground'>{Number(ex.outputAmount) / 1e6} USDC</span>
                      <a
                        href={`https://solscan.io/tx/${ex.txSignature}${SOLSCAN_CLUSTER}`}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors'
                      >
                        <span className='font-mono'>{shorten(ex.txSignature, 4, 4)}</span>
                        <ExternalLink className='h-3 w-3 shrink-0' />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <QRModal
        open={qrOpen}
        onClose={() => setQROpen(false)}
        payUrl={payUrl}
        label={`${Number(link.amount).toFixed(2)} USDC`}
      />
    </div>
  )
}
