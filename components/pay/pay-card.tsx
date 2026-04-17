'use client'

import { useState, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { usePaymentLink } from '@/lib/hooks/use-payment-link'
import { useQuote } from '@/lib/hooks/use-quote'
import { TokenSelector, type TokenInfo } from './token-selector'
import { QuoteDisplay } from './quote-display'
import { PayButton } from './pay-button'
import { SuccessOverlay } from './success-overlay'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { QRCodeCanvas } from 'qrcode.react'
import { QrCode, Download, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { JupiterCallout } from './jupiter-callout'

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function PayCard({ linkId }: { linkId: string }) {
  const { data: link, isLoading: linkLoading, error: linkError } = usePaymentLink(linkId)
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null)
  const {
    quote,
    isLoading: quoteLoading,
    isRefreshing,
    isDirect,
    error: quoteError,
  } = useQuote(
    linkId,
    selectedToken?.mint ?? null,
    link?.token ?? null, // outputMint — used to detect same-mint and skip polling
  )
  const [successTx, setSuccessTx] = useState<string | null>(null)
  const [qrExpanded, setQrExpanded] = useState(false)
  const qrWrapperRef = useRef<HTMLDivElement>(null)

  const payUrl = typeof window !== 'undefined' ? `${window.location.origin}/pay/${linkId}` : ''

  const handleDownloadQr = useCallback(() => {
    const canvas = qrWrapperRef.current?.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `settlex-qr-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [])

  return (
    <div className='relative flex flex-1 w-full items-center justify-center bg-background px-4 py-20'>
      <BackgroundBeams className='opacity-40' />

      <div className='relative z-10 flex w-full max-w-sm flex-col items-center gap-4'>
        {/* Jupiter moat callout — always visible above the card */}
        <JupiterCallout />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className='w-full'
        >
        <div className='rounded-2xl border border-border/50 bg-card/80 p-6 shadow-2xl backdrop-blur-sm'>
          {/* Header */}
          <div className='mb-6 text-center'>
            <h1 className='text-xl font-bold text-foreground'>Payment Request</h1>
            {link && (
              <p className='mt-1 font-mono text-xs text-muted-foreground'>from {shorten(link.merchantWallet)}</p>
            )}
          </div>

          <AnimatePresence mode='wait'>
            {successTx ? (
              <motion.div key='success' initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <SuccessOverlay txSignature={successTx} amount={link?.amount ?? ''} />
              </motion.div>
            ) : linkLoading ? (
              <motion.div key='loading' className='space-y-3'>
                {[40, 28, 20].map((h, i) => (
                  <div key={i} className={`h-${h > 30 ? 12 : h > 24 ? 8 : 5} animate-pulse rounded-xl bg-muted`} />
                ))}
              </motion.div>
            ) : linkError || !link ? (
              <motion.div key='error' className='py-10 text-center'>
                <p className='text-sm text-muted-foreground'>This payment link is not available.</p>
              </motion.div>
            ) : (
              <motion.div key='form' className='space-y-4'>
                {/* Amount due */}
                <div className='rounded-xl border border-border/30 bg-muted/20 p-4 text-center'>
                  <p className='text-xs text-muted-foreground'>Amount due</p>
                  <p className='mt-1 text-4xl font-bold tracking-tight text-foreground'>
                    {Number(link.amount).toFixed(2)}
                  </p>
                  <p className='text-sm text-muted-foreground'>USDC</p>
                </div>

                {/* Token selector */}
                <div>
                  <p className='mb-2 text-xs font-medium text-muted-foreground'>Pay with</p>
                  <TokenSelector selected={selectedToken} onChange={setSelectedToken} />
                </div>

                {/* Quote */}
                <QuoteDisplay
                  isLoading={quoteLoading}
                  isRefreshing={isRefreshing}
                  isDirect={isDirect}
                  quote={quote}
                  error={quoteError}
                  selectedToken={selectedToken}
                  outputAmountUSDC={Number(link.amount).toFixed(2)}
                />

                {/* Pay button */}
                <PayButton
                  linkId={linkId}
                  selectedToken={selectedToken}
                  quoteReady={!!quote && !quoteLoading && !isRefreshing}
                  onSuccess={(sig) => setSuccessTx(sig)}
                />

                {/* QR Code — scan from another device */}
                <div className='mt-2 rounded-xl border border-border/30 bg-muted/10'>
                  <button
                    type='button'
                    onClick={() => setQrExpanded((v) => !v)}
                    className='flex w-full items-center justify-between px-4 py-3 text-left'
                  >
                    <span className='flex items-center gap-2 text-xs font-medium text-muted-foreground'>
                      <QrCode className='h-3.5 w-3.5' />
                      Scan to pay from another device
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                        qrExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {qrExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className='overflow-hidden'
                      >
                        <div className='flex flex-col items-center gap-3 px-4 pb-4'>
                          <div
                            ref={qrWrapperRef}
                            className='rounded-xl border border-border/30 bg-white p-3 shadow-inner'
                          >
                            <QRCodeCanvas
                              value={payUrl}
                              size={180}
                              bgColor='#ffffff'
                              fgColor='#0f172a'
                              level='M'
                              imageSettings={{
                                src: '/favicon.ico',
                                height: 24,
                                width: 24,
                                excavate: true,
                              }}
                            />
                          </div>
                          <Button
                            variant='outline'
                            size='xs'
                            className='gap-1.5 border-border/40 text-xs'
                            onClick={handleDownloadQr}
                          >
                            <Download className='h-3 w-3' />
                            Download QR
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </motion.div>
      </div>
    </div>
  )
}
