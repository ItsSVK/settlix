'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const maxWidthClass = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
} as const

interface DialogShellProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: keyof typeof maxWidthClass
  align?: 'center' | 'top'
}

export function DialogShell({
  open,
  onClose,
  title,
  children,
  maxWidth = 'lg',
  align = 'center',
}: DialogShellProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className='fixed inset-0 z-100 overflow-y-auto'>
          <div
            className={`flex min-h-full justify-center p-4 ${
              align === 'top' ? 'items-start pt-12' : 'items-center'
            }`}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='fixed inset-0 bg-background/80 backdrop-blur-md'
            />
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`relative w-full ${maxWidthClass[maxWidth]} rounded-3xl border border-border/40 bg-card/60 p-6 shadow-2xl outline-none ring-1 ring-white/5 backdrop-blur-xl`}
            >
              <div className='mb-6 flex items-center justify-between'>
                <h2 className='text-lg font-semibold tracking-tight text-foreground'>{title}</h2>
                <Button
                  onClick={onClose}
                  variant='ghost'
                  className='rounded-full p-2 text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground'
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>
              {children}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
