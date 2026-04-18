'use client'

import { useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import { ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'

interface AddressAmountFormProps {
  onContinue: (receiverWallet: string, amount: string) => void
}

function isValidSolanaAddress(addr: string): boolean {
  try {
    new PublicKey(addr)
    return true
  } catch {
    return false
  }
}

export function AddressAmountForm({ onContinue }: AddressAmountFormProps) {
  const [receiver, setReceiver] = useState('')
  const [amount, setAmount] = useState('')
  const [errors, setErrors] = useState<{ receiver?: string; amount?: string }>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: typeof errors = {}

    if (!receiver.trim()) {
      newErrors.receiver = 'Receiver address is required'
    } else if (!isValidSolanaAddress(receiver.trim())) {
      newErrors.receiver = 'Not a valid Solana address'
    }

    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed) || parsed <= 0) {
      newErrors.amount = 'Enter a valid amount'
    } else if (parsed < 0.01) {
      newErrors.amount = 'Minimum amount is 0.01 USDC'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onContinue(receiver.trim(), parseFloat(amount).toFixed(6))
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className='space-y-4'
    >
      {/* Receiver */}
      <div className='space-y-1.5'>
        <label className='text-xs font-medium text-muted-foreground'>Send to</label>
        <input
          type='text'
          value={receiver}
          onChange={(e) => {
            setReceiver(e.target.value)
            if (errors.receiver) setErrors((p) => ({ ...p, receiver: undefined }))
          }}
          placeholder='Solana wallet address'
          className='w-full rounded-xl border border-border/50 bg-muted/20 px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors'
          spellCheck={false}
          autoComplete='off'
        />
        {errors.receiver && <p className='text-xs text-destructive'>{errors.receiver}</p>}
      </div>

      {/* Amount */}
      <div className='space-y-1.5'>
        <label className='text-xs font-medium text-muted-foreground'>Amount</label>
        <div className='relative'>
          <input
            type='number'
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              if (errors.amount) setErrors((p) => ({ ...p, amount: undefined }))
            }}
            placeholder='0.00'
            min='0.01'
            step='0.01'
            className='w-full rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors pr-16'
          />
          <span className='absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-green-500'>USDC</span>
        </div>
        {errors.amount && <p className='text-xs text-destructive'>{errors.amount}</p>}
      </div>

      <button
        type='submit'
        className='flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]'
      >
        Preview Payment
        <ArrowRight className='h-4 w-4' />
      </button>
    </motion.form>
  )
}
