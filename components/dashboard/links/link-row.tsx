'use client'

const SOLSCAN_CLUSTER = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet' ? '?cluster=devnet' : ''

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'motion/react'
import { Copy, Check, ExternalLink, ToggleLeft, ToggleRight, QrCode, GitFork, RefreshCw } from 'lucide-react'
import type { Link } from '@/lib/hooks/use-links'
import { Button } from '@/components/ui/button'
import { copyText } from '@/lib/utils'
import { toast } from 'sonner'
import { QRModal } from './qr-modal'
import { SplitModal } from './split-modal'
import { getDecimalsByMint, getLogoByMint, getNameByMint, TOKENS } from '@/lib/tokens/tokens'
import { ConfirmationModal } from '@/components/shared/confirmation-modal'

function shorten(s: string, start = 6, end = 4) {
  return `${s.slice(0, start)}…${s.slice(-end)}`
}

interface LinkRowProps {
  link: Link
  onToggle: (id: string, active: boolean) => Promise<void>
  onRefresh: () => void
  onArchive: (id: string) => Promise<void>
}

export function LinkRow({ link, onToggle, onRefresh, onArchive }: LinkRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [qrOpen, setQROpen] = useState(false)
  const [splitOpen, setSplitOpen] = useState(false)
  const [archiving, setArchiving] = useState<string | null>(null)
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null)

  const payUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/pay/${link.id}`

  const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date()
  const isSoldOut = link.maxUses && link.stats.paidCount >= link.maxUses

  const handleArchive = async (id: string) => {
    setArchiving(id)
    try {
      await onArchive(id)
      toast.success('Link archived successfully')
      onRefresh()
    } catch {
      toast.error('Failed to archive link')
    } finally {
      setArchiving(null)
      setConfirmArchive(null)
    }
  }

  const handleToggle = async () => {
    setToggling(true)
    try {
      await onToggle(link.id, !link.active)
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className='group rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm shadow-sm transition-all hover:bg-card/60 hover:border-border/60 hover:shadow-md'>
      {/* Main row */}
      <div className='flex cursor-pointer items-center gap-3 p-3.5' onClick={() => setExpanded((v) => !v)}>
        {/* Status Badge */}
        <div
          className={`flex items-center gap-1.5 rounded-full px-2 py-2 md:py-0.5 text-[9px] font-bold uppercase tracking-wider ${
            isExpired || isSoldOut
              ? 'bg-destructive/10 text-destructive'
              : link.active
                ? 'bg-green-500/10 text-green-500'
                : 'bg-muted text-muted-foreground'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isExpired || isSoldOut ? 'bg-destructive' : link.active ? 'bg-green-500' : 'bg-muted-foreground'
            }`}
          />
          <span className='hidden md:flex'>
            {isExpired ? 'Expired' : isSoldOut ? 'Sold Out' : link.active ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Info */}
        <div className='flex flex-col flex-1 min-w-0'>
          {link.title ? (
            <span className='truncate text-[13px] font-semibold text-foreground'>{link.title}</span>
          ) : (
            <span className='truncate font-mono text-[11px] text-muted-foreground/70'>{shorten(link.id, 8, 6)}</span>
          )}
          <div className='flex items-center gap-1.5 flex-wrap'>
            <span className='text-xs font-bold text-foreground flex items-center gap-1'>
              <Image
                src={getLogoByMint(link.token) ?? ''}
                alt='token'
                width={16}
                height={16}
                className='inline-block'
              />
              {Number(link.amount).toFixed(2)}
            </span>
            {link.type === 'subscription' && link.interval && (
              <span className='flex items-center gap-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-500'>
                <RefreshCw className='h-2.5 w-2.5' />
                {link.interval}
              </span>
            )}
            {link.description && (
              <span className='truncate text-[11px] text-muted-foreground max-w-[200px]'>• {link.description}</span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className='hidden items-center gap-4 sm:flex mx-3 opacity-70 group-hover:opacity-100 transition-opacity'>
          <div className='flex flex-col items-center justify-center'>
            <span className='text-[9px] font-semibold text-muted-foreground uppercase tracking-wider'>Paid</span>
            <span className='text-[13px] font-bold text-foreground'>{link.stats.paidCount}</span>
          </div>
          <div className='flex flex-col items-center justify-center'>
            <span className='text-[9px] font-semibold text-muted-foreground uppercase tracking-wider'>Failed</span>
            <span className='text-[13px] font-bold text-foreground'>{link.stats.failedCount}</span>
          </div>
          {link.stats.successRate !== null && (
            <div className='flex flex-col items-center justify-center'>
              <span className='text-[9px] font-semibold text-muted-foreground uppercase tracking-wider'>Success</span>
              <span className='text-[13px] font-bold text-green-500'>{link.stats.successRate}%</span>
            </div>
          )}
        </div>

        {/* Actions Strip */}
        <div
          className='flex items-center gap-1 rounded-xl bg-muted/40 pl-2 border border-border/30'
          onClick={(e) => e.stopPropagation()}
        >
          {/* Splits */}
          {link.recipients.length > 0 && (
            <Button
              onClick={() => setSplitOpen(true)}
              title='Split Allocation'
              variant='ghost'
              size='sm'
              className='h-6 w-6 rounded-lg p-0 text-indigo-500/80 hover:bg-indigo-500/10 hover:text-indigo-500 transition-colors'
            >
              <GitFork className='h-3 w-3' />
            </Button>
          )}

          {/* QR Code */}
          <Button
            onClick={() => setQROpen(true)}
            title='Show QR code'
            variant='ghost'
            size='sm'
            className='h-6 w-6 rounded-lg p-0 text-muted-foreground hover:bg-background/80 hover:text-foreground transition-colors'
          >
            <QrCode className='h-3 w-3' />
          </Button>

          <Button
            onClick={() => copyText(payUrl, setCopied)}
            title='Copy URL'
            variant='ghost'
            size='sm'
            className='h-6 w-6 rounded-lg p-0 text-muted-foreground hover:bg-background/80 hover:text-foreground transition-colors'
          >
            {copied ? <Check className='h-3 w-3 text-green-500' /> : <Copy className='h-3 w-3' />}
          </Button>

          {/* Open page */}
          <Button
            onClick={() => window.open(payUrl, '_blank')}
            title='Open page'
            variant='ghost'
            size='sm'
            className='hidden md:flex h-6 w-6 rounded-lg p-0 text-muted-foreground hover:bg-background/80 hover:text-foreground transition-colors'
          >
            <ExternalLink className='h-3 w-3' />
          </Button>

          <div className='w-px h-4 bg-border/50 mx-1' />

          {/* Toggle */}
          <Button
            onClick={handleToggle}
            disabled={toggling}
            title={link.active ? 'Deactivate' : 'Activate'}
            variant='ghost'
            size='sm'
            className='h-6 w-6 rounded-lg p-0 text-muted-foreground hover:bg-background/80 hover:text-foreground transition-colors'
          >
            {link.active ? <ToggleRight className='h-5 w-5 text-green-500' /> : <ToggleLeft className='h-5 w-5' />}
          </Button>

          <ConfirmationModal
            className='text-red-500 h-6 w-6 rounded-lg p-0 hover:bg-background/80 hover:text-foreground transition-colors'
            handleArchive={handleArchive}
            archiving={archiving}
            confirmArchive={confirmArchive}
            setConfirmArchive={setConfirmArchive}
            item={{ id: link.id }}
            type='Archive'
          />
        </div>

        {/* <div className='hidden md:flex h-6 w-6 items-center justify-center rounded-full bg-muted/40 transition-colors group-hover:bg-muted/80 ml-2'>
          <ChevronDown
            className={`h-3 w-3 text-muted-foreground transition-transform duration-300 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </div> */}
      </div>

      {/* Expanded view */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className='overflow-hidden'
          >
            <div className='border-t border-border/30 bg-muted/10 px-3.5 pb-4 pt-3'>
              <div
                className={`text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex justify-center`}
              >
                <span className={isExpired ? 'text-red-500' : ''}>
                  {link.expiresAt
                    ? new Date(link.expiresAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: true,
                      })
                    : ''}
                </span>
                {link.expiresAt && !!link.maxUses && <span className='mx-2'>•</span>}
                {link.maxUses && (
                  <span className={` ${isSoldOut ? 'text-destructive' : ''}`}>
                    {`${link.stats.paidCount}/${link.maxUses} uses`}
                  </span>
                )}
              </div>
              {link.recentExecutions.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-4'>
                  <div className='h-6 w-6 rounded-full bg-muted/50 flex items-center justify-center mb-1.5'>
                    <span className='text-muted-foreground/50'>...</span>
                  </div>
                  <p className='text-xs font-medium text-muted-foreground'>No payments yet</p>
                </div>
              ) : (
                <div className='space-y-2'>
                  <p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                    Recent payments
                  </p>
                  <div className='flex flex-col gap-1.5'>
                    {link.recentExecutions.map((ex) => (
                      <div
                        key={ex.id}
                        className='flex items-center gap-2 rounded-xl bg-card border border-border/60 px-3 py-2.5 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:border-border/80'
                      >
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            ex.status === 'paid'
                              ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                              : 'bg-destructive'
                          }`}
                        />
                        <div className='flex items-center gap-2 flex-1'>
                          {ex.userWallet ? (
                            <a
                              href={`https://solscan.io/account/${ex.userWallet}${SOLSCAN_CLUSTER}`}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='font-mono text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors'
                            >
                              {shorten(ex.userWallet)}
                            </a>
                          ) : (
                            <span className='font-mono text-[11px] font-medium text-muted-foreground'>Anonymous</span>
                          )}
                        </div>
                        <span className='font-bold text-xs text-foreground'>
                          <Image
                            src={getLogoByMint(ex.inputToken) ?? ''}
                            alt={getNameByMint(ex.inputToken)}
                            width={16}
                            height={16}
                            className='inline-block rounded-full'
                          />{' '}
                          {(Number(ex.inputAmount) * (1 / Math.pow(10, getDecimalsByMint(ex.inputToken)))).toFixed(
                            getDecimalsByMint(ex.inputToken),
                          )}
                          {/* <span className='text-[10px] font-normal text-muted-foreground'>
                            {getNameByMint(ex.inputToken)}
                          </span> */}
                        </span>

                        <div className='w-px h-2.5 bg-border/60 mx-1' />

                        <a
                          href={`https://solscan.io/tx/${ex.txSignature}${SOLSCAN_CLUSTER}`}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='flex items-center justify-center h-6 w-6 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors'
                          title='View transaction'
                        >
                          <ExternalLink className='h-3 w-3' />
                        </a>
                      </div>
                    ))}
                  </div>
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

      {link.recipients.length > 0 && <SplitModal open={splitOpen} onClose={() => setSplitOpen(false)} link={link} />}
    </div>
  )
}
