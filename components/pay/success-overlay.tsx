'use client'

import { motion } from 'motion/react'
import { CheckCircle, ExternalLink } from 'lucide-react'
import { JupiterLogo } from '@/components/shared/jupiter-logo'

const SOLSCAN_CLUSTER = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet' ? '?cluster=devnet' : ''

interface SwapDetails {
  /** Raw integer string from Jupiter, e.g. "2300000000" for 2.3 SOL */
  inputAmount: string
  inputDecimals: number
  inputSymbol: string
}

interface SuccessOverlayProps {
  txSignature: string
  /** Human-decimal USDC amount the merchant receives, e.g. "47.82" */
  amount: string
  /** Present for web-wallet flow; absent for Phantom QR (server-side) flow */
  swap?: SwapDetails
}

function formatInput(raw: string, decimals: number): string {
  const n = Number(raw) / Math.pow(10, decimals)
  if (n < 1) return n.toFixed(6)
  if (n < 1000) return n.toFixed(4)
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export function SuccessOverlay({ txSignature, amount, swap }: SuccessOverlayProps) {
  const explorerUrl = `https://solscan.io/tx/${txSignature}${SOLSCAN_CLUSTER}`

  const outHuman = Number(amount)
  const inHuman = swap ? Number(swap.inputAmount) / Math.pow(10, swap.inputDecimals) : null
  const rate = inHuman && inHuman > 0 ? outHuman / inHuman : null
  const isDirect = swap?.inputSymbol === 'USDC'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className='flex flex-col items-center gap-5 py-4 text-center'
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 18 }}
      >
        <CheckCircle className='h-14 w-14 text-green-500' strokeWidth={1.5} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <h3 className='text-xl font-bold text-foreground'>Payment sent!</h3>
      </motion.div>

      {/* Swap receipt — only rendered when web-wallet flow provides swap data */}
      {swap && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className='w-full rounded-xl border border-border/30 bg-muted/20 divide-y divide-border/30 text-left'
        >
          {/* You paid */}
          <div className='flex items-center justify-between px-4 py-2.5'>
            <span className='text-xs text-muted-foreground'>You paid</span>
            <span className='text-sm font-semibold text-foreground'>
              {formatInput(swap.inputAmount, swap.inputDecimals)}{' '}
              <span className='text-muted-foreground font-normal'>{swap.inputSymbol}</span>
            </span>
          </div>

          {/* Merchant received */}
          <div className='flex items-center justify-between px-4 py-2.5'>
            <span className='text-xs text-muted-foreground'>Merchant received</span>
            <span className='text-sm font-semibold text-foreground'>
              {outHuman.toFixed(2)} <span className='text-green-500 font-normal'>USDC</span>
            </span>
          </div>

          {/* Exchange rate — hidden for direct USDC transfers */}
          {!isDirect && rate && (
            <div className='flex items-center justify-between px-4 py-2.5'>
              <span className='text-xs text-muted-foreground'>Rate</span>
              <span className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                <JupiterLogo className='h-3 w-3 shrink-0' />1 {swap.inputSymbol} = {rate.toFixed(4)} USDC
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* Solscan link */}
      <motion.a
        href={explorerUrl}
        target='_blank'
        rel='noopener noreferrer'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: swap ? 0.5 : 0.4 }}
        className='flex items-center gap-1.5 rounded-lg border border-border/50 px-4 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground'
      >
        View on Solscan
        <ExternalLink className='h-3 w-3' />
      </motion.a>
    </motion.div>
  )
}
