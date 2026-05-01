'use client'

import { motion, AnimatePresence } from 'motion/react'
import { AlertCircle } from 'lucide-react'

export function FormErrorBanner({ error }: { error: string }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          key='form-error'
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className='flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive'
        >
          <AlertCircle className='mt-0.5 h-4 w-4 shrink-0' />
          <p className='font-medium'>{error}</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
