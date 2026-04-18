'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { QRCodeCanvas } from 'qrcode.react'
import { CheckCircle, ExternalLink, Loader2, X, XCircle } from 'lucide-react'
import type { TokenInfo } from './token-selector'

interface PhantomQrModalProps {
  linkId: string
  selectedToken: TokenInfo
  onClose: () => void
  onSuccess: (txSignature: string) => void
}

type ModalStatus = 'waiting' | 'confirmed' | 'timeout' | 'error'

const POLL_INTERVAL_MS = 2_000
const CLUSTER = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet' ? '?cluster=devnet' : ''

export function PhantomQrModal({ linkId, selectedToken, onClose, onSuccess }: PhantomQrModalProps) {
  // sessionId is stable for the lifetime of this modal.
  const [sessionId] = useState(() => crypto.randomUUID())
  const [status, setStatus] = useState<ModalStatus>('waiting')
  const [txSignature, setTxSignature] = useState<string | null>(null)

  // Build the Solana Pay Transaction Request URL.
  // inputMint and sessionId are in the PATH (not query params) because Phantom
  // strips query params when it makes the POST request to the same URL.
  const solanaPayUrl =
    typeof window !== 'undefined'
      ? `solana:${window.location.origin}/api/pay/${linkId}/solana-pay/${selectedToken.mint}/${sessionId}`
      : ''

  // Poll the status endpoint until confirmed, timeout, or error.
  useEffect(() => {
    if (status !== 'waiting') return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/pay/${linkId}/status?session=${sessionId}`)
        if (!res.ok) return

        const data = (await res.json()) as {
          status: 'watching' | 'confirmed' | 'timeout' | 'not_found'
          txSignature?: string | null
        }

        if (data.status === 'confirmed' && data.txSignature) {
          setTxSignature(data.txSignature)
          setStatus('confirmed')
          clearInterval(interval)
        } else if (data.status === 'timeout') {
          setStatus('timeout')
          clearInterval(interval)
        }
      } catch {
        // Transient network error — keep polling.
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [status, linkId, sessionId])

  // Auto-close after 3s on success so the pay-card success overlay takes over.
  useEffect(() => {
    if (status !== 'confirmed' || !txSignature) return
    const t = setTimeout(() => {
      onSuccess(txSignature)
    }, 2_500)
    return () => clearTimeout(t)
  }, [status, txSignature, onSuccess])

  // Close on Escape key.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key='backdrop'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className='fixed inset-0 z-50 bg-black/60 backdrop-blur-sm'
      />

      {/* Panel */}
      <motion.div
        key='panel'
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 10 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className='fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none'
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className='pointer-events-auto w-full max-w-xs rounded-2xl border border-border/50 bg-card/95 p-6 shadow-2xl backdrop-blur-sm'
        >
          {/* Header */}
          <div className='mb-5 flex items-start justify-between'>
            <div>
              <h2 className='text-base font-bold text-foreground'>Pay with Phantom</h2>
              <p className='mt-0.5 text-xs text-muted-foreground'>Open Phantom → tap QR scanner → scan</p>
            </div>
            <button
              onClick={onClose}
              className='rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground'
            >
              <X className='h-4 w-4' />
            </button>
          </div>

          {/* Body */}
          <AnimatePresence mode='wait'>
            {status === 'waiting' && (
              <motion.div
                key='waiting'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className='flex flex-col items-center gap-4'
              >
                {/* QR */}
                <div className='rounded-xl border border-border/30 bg-white p-3 shadow-inner'>
                  {solanaPayUrl ? (
                    <QRCodeCanvas
                      value={solanaPayUrl}
                      size={200}
                      bgColor='#ffffff'
                      fgColor='#0f172a'
                      level='M'
                      imageSettings={{
                        src: '/icon.png',
                        height: 28,
                        width: 28,
                        excavate: true,
                      }}
                    />
                  ) : (
                    <div className='h-[200px] w-[200px] animate-pulse rounded bg-muted' />
                  )}
                </div>

                {/* Token info */}
                <div className='flex items-center gap-2 rounded-lg border border-border/30 bg-muted/20 px-3 py-2'>
                  {selectedToken.logoURI && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedToken.logoURI}
                      alt={selectedToken.symbol}
                      width={18}
                      height={18}
                      className='h-[18px] w-[18px] rounded-full'
                    />
                  )}
                  <span className='text-xs text-muted-foreground'>
                    Paying with <span className='font-semibold text-foreground'>{selectedToken.symbol}</span>
                    {' → merchant receives USDC'}
                  </span>
                </div>

                {/* Polling indicator */}
                <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                  <Loader2 className='h-3 w-3 animate-spin' />
                  Waiting for signature…
                </div>
              </motion.div>
            )}

            {status === 'confirmed' && txSignature && (
              <motion.div
                key='confirmed'
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className='flex flex-col items-center gap-4 py-4 text-center'
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 18 }}
                >
                  <CheckCircle className='h-14 w-14 text-green-500' strokeWidth={1.5} />
                </motion.div>
                <div>
                  <p className='font-bold text-foreground'>Payment confirmed!</p>
                  <p className='mt-1 text-xs text-muted-foreground'>Transaction landed on-chain</p>
                </div>
                <a
                  href={`https://solscan.io/tx/${txSignature}${CLUSTER}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground'
                >
                  View on Solscan
                  <ExternalLink className='h-3 w-3' />
                </a>
              </motion.div>
            )}

            {(status === 'timeout' || status === 'error') && (
              <motion.div
                key='error'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className='flex flex-col items-center gap-4 py-4 text-center'
              >
                <XCircle className='h-12 w-12 text-destructive' strokeWidth={1.5} />
                <div>
                  <p className='font-semibold text-foreground'>
                    {status === 'timeout' ? 'Session timed out' : 'Something went wrong'}
                  </p>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    {status === 'timeout' ? 'The QR code expired. Close and try again.' : 'Close and try again.'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className='rounded-xl border border-border/50 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground'
                >
                  Close
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
