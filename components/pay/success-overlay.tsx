'use client'

import { motion } from 'motion/react'
import { CheckCircle, ExternalLink } from 'lucide-react'

interface SuccessOverlayProps {
  txSignature: string
  amount: string
}

export function SuccessOverlay({ txSignature, amount }: SuccessOverlayProps) {
  const explorerUrl = `https://solscan.io/tx/${txSignature}`

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className='flex flex-col items-center gap-5 py-6 text-center'
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 18 }}
      >
        <CheckCircle className='h-16 w-16 text-green-500' strokeWidth={1.5} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <h3 className='text-xl font-bold text-foreground'>Payment sent!</h3>
        <p className='mt-1 text-sm text-muted-foreground'>
          The merchant will receive <span className='font-semibold text-foreground'>{amount}&nbsp;USDC</span>
        </p>
      </motion.div>

      <motion.a
        href={explorerUrl}
        target='_blank'
        rel='noopener noreferrer'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className='flex items-center gap-1.5 rounded-lg border border-border/50 px-4 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground'
      >
        View on Solscan
        <ExternalLink className='h-3 w-3' />
      </motion.a>
    </motion.div>
  )
}
