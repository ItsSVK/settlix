'use client'

import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { PayCardBase } from '@/components/pay/pay-card-base'

interface CheckoutOverlayProps {
  activeId: string | null
  onClose: () => void
  onPaid: (txSignature: string) => void
}

export function CheckoutOverlay({ activeId, onClose, onPaid }: CheckoutOverlayProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (!activeId) return
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [activeId, handleKey])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {activeId && (
        <motion.div
          key='overlay'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className='fixed inset-0 z-100 flex items-center justify-center bg-background/80 backdrop-blur-md px-4'
        >
          <div className='relative z-10 flex w-full max-w-sm flex-col items-center gap-4'>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className='absolute -top-3 right-0 z-10 mt-8 mr-4'
            >
              <Button
                onClick={onClose}
                variant='outline'
                size='icon'
                aria-label='Close checkout'
                className='flex h-8 w-8 items-center justify-center rounded-full bg-muted/80 text-muted-foreground shadow-md transition hover:bg-muted hover:text-foreground border-border/50 backdrop-blur-sm'
              >
                <X className='h-4 w-4' />
              </Button>
            </motion.div>
            <PayCardBase linkId={activeId} onPaid={onPaid} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
