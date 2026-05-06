'use client'

import { useRef, useCallback, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { X, Download, Copy, Check, QrCode } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { copyText } from '@/lib/utils'

interface QRModalProps {
  open: boolean
  onClose: () => void
  /** The full payment URL e.g. https://settlix.app/pay/abc123 */
  payUrl: string
  /** Human-readable label shown above the QR (e.g. "10.00 USDC") */
  label: string
}

export function QRModal({ open, onClose, payUrl, label }: QRModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Walk up from the QRCodeCanvas wrapper to find the <canvas>
  const qrWrapperRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      canvasRef.current = node.querySelector('canvas')
    }
  }, [])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const pad = 28
    const labelH = 36
    const out = document.createElement('canvas')
    out.width = canvas.width + pad * 2
    out.height = canvas.height + pad * 2 + labelH
    const ctx = out.getContext('2d')
    if (!ctx) return

    // White background with rounded corners
    ctx.fillStyle = '#ffffff'
    const r = 20
    ctx.beginPath()
    ctx.roundRect(0, 0, out.width, out.height, r)
    ctx.fill()

    // QR code
    ctx.drawImage(canvas, pad, pad)

    // "settlix.itssvk.dev" label at bottom
    ctx.fillStyle = '#94a3b8'
    ctx.font = `500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('settlix.itssvk.dev', out.width / 2, canvas.height + pad * 2 + labelH / 2 + 4)

    const link = document.createElement('a')
    link.download = `settlix-qr-${Date.now()}.png`
    link.href = out.toDataURL('image/png')
    link.click()
  }

  const content = (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key='qr-backdrop'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className='fixed inset-0 z-100 bg-black/60 backdrop-blur-sm'
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key='qr-panel'
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className='fixed left-1/2 top-1/2 z-100 w-[min(340px,90vw)] -translate-x-1/2 -translate-y-1/2'
          >
            <div className='relative rounded-3xl border border-border/50 bg-card/95 p-6 shadow-[0_32px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl'>
              {/* Close */}
              <Button
                onClick={onClose}
                className='absolute right-4 top-4 rounded-full w-8 h-8 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
                aria-label='Close QR modal'
                variant={'ghost'}
              >
                <X className='h-4 w-4' />
              </Button>

              {/* Header */}
              <div className='mb-5 flex items-center gap-2'>
                <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10'>
                  <QrCode className='h-4 w-4 text-primary' />
                </div>
                <div>
                  <p className='text-sm font-semibold text-foreground'>Payment QR</p>
                  <p className='mt-0.5 text-xs font-medium text-muted-foreground'>{label}</p>
                </div>
              </div>

              {/* QR Code */}
              <div className='flex justify-center'>
                <div ref={qrWrapperRef} className='rounded-xl border border-border/30 bg-white p-4 shadow-inner'>
                  <QRCodeCanvas
                    value={payUrl}
                    size={220}
                    bgColor='#ffffff'
                    fgColor='#0f172a'
                    level='M'
                    imageSettings={{
                      src: '/logo.png',
                      height: 28,
                      width: 28,
                      excavate: true,
                    }}
                  />
                </div>
              </div>

              {/* URL pill */}
              {/* <div className='mt-4 rounded-xl border border-border/30 bg-muted/30 px-3 py-2 text-center'>
                <p className='truncate font-mono text-[10px] text-muted-foreground'>{payUrl}</p>
              </div> */}

              {/* Actions */}
              <div className='mt-4 flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  className='flex-1 gap-1.5 rounded-xl border-border/40 text-xs shadow-sm bg-background/50 hover:bg-muted/50 transition-all font-medium'
                  onClick={() => copyText(payUrl, setCopied)}
                >
                  {copied ? <Check className='h-3.5 w-3.5 text-green-500' /> : <Copy className='h-3.5 w-3.5' />}
                  {copied ? 'Copied!' : 'Copy URL'}
                </Button>

                <Button
                  size='sm'
                  className='flex-1 gap-1.5 rounded-xl text-xs shadow-sm transition-all font-medium py-3.5'
                  onClick={handleDownload}
                >
                  <Download className='h-3.5 w-3.5' />
                  Download
                </Button>
              </div>

              {/* Hint */}
              <p className='mt-3 text-center text-[9px] font-medium uppercase tracking-wider text-muted-foreground'>
                Scan to continue payment
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  if (!mounted) return null
  return createPortal(content, document.body)
}
