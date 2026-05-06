'use client'

import { useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, Loader2, Zap } from 'lucide-react'
import type { TokenInfo } from '@/components/pay/token-selector'
import { cn } from '@/lib/utils'
import { usePaymentFlow } from '@/lib/hooks/use-payment-flow'
import type { SwapReceipt } from '@/lib/hooks/use-payment-flow'

const STEP_LABELS = {
  idle: 'Send Now',
  building: 'Building transaction…',
  signing: 'Waiting for signature…',
  executing: 'Submitting to network…',
  done: 'Sent!',
  error: 'Transaction failed',
} as const

interface DirectPayButtonProps {
  receiverWallet: string
  amount: string
  selectedToken: TokenInfo | null
  quoteReady: boolean
  onSuccess: (txSignature: string, swap: SwapReceipt) => void
  className?: string
}

export function DirectPayButton({
  receiverWallet,
  amount,
  selectedToken,
  quoteReady,
  onSuccess,
  className,
}: DirectPayButtonProps) {
  const {
    step,
    setStep,
    errorMsg,
    isLoading,
    connected,
    publicKey,
    requestWalletConnection,
    signAndExecute,
    handleError,
  } = usePaymentFlow({ onSuccess })

  const send = useCallback(async () => {
    if (!connected || !publicKey) {
      requestWalletConnection()
      return
    }
    if (!selectedToken || !quoteReady) return

    try {
      // 1. Build order
      setStep('building')
      const orderRes = await fetch('/api/checkout/transfer/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputMint: selectedToken.mint, taker: publicKey.toBase58(), receiverWallet, amount }),
      })
      const orderData = await orderRes.json()
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to build transaction')

      const { transaction: txBase64, requestId, isDirect, inAmount } = orderData

      const recordingContext = {
        receiverWallet,
        userWallet: publicKey.toBase58(),
        inputMint: selectedToken.mint,
      }

      // 2 + 3. Sign and execute
      await signAndExecute(
        txBase64,
        async (signedBase64) => {
          if (isDirect) {
            const res = await fetch('/api/checkout/transfer/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                signedTransaction: signedBase64,
                ...recordingContext,
                inputAmount: inAmount,
                outputAmount: String(Math.round(parseFloat(amount) * 1_000_000)),
              }),
            })
            const body = await res.json()
            if (!res.ok || body.status !== 'Success') throw new Error(body.error || 'Transfer failed')
            return { status: 'Success', signature: body.signature, inputAmountResult: inAmount }
          } else {
            const res = await fetch('/api/checkout/transfer/execute', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ signedTransaction: signedBase64, requestId, ...recordingContext }),
            })
            if (!res.ok) throw new Error('Execution failed')
            const execData = await res.json()
            if (execData.status !== 'Success') throw new Error('Transaction did not succeed')
            return execData
          }
        },
        { selectedToken, inAmount },
      )
    } catch (e) {
      handleError(e)
    }
  }, [
    connected,
    publicKey,
    selectedToken,
    quoteReady,
    receiverWallet,
    amount,
    requestWalletConnection,
    signAndExecute,
    handleError,
    setStep,
  ])

  const isDisabled = isLoading || step === 'done' || !selectedToken || !quoteReady

  if (!connected) {
    return (
      <button
        onClick={requestWalletConnection}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 py-3.5 text-sm font-semibold text-primary transition-all hover:border-primary hover:bg-primary/5',
          className,
        )}
      >
        Connect Wallet to Send
      </button>
    )
  }

  return (
    <div className='space-y-2'>
      <button
        onClick={send}
        disabled={isDisabled}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground',
          'transition-all duration-200 hover:opacity-90 active:scale-[0.98]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          step === 'error' && 'bg-destructive',
          step === 'done' && 'bg-green-600',
          className,
        )}
      >
        {isLoading && <Loader2 className='h-4 w-4 animate-spin' />}
        {step === 'idle' && <Zap className='h-4 w-4' />}
        {STEP_LABELS[step]}
      </button>

      <AnimatePresence>
        {step === 'error' && errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className='flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2.5'
          >
            <AlertCircle className='mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive' />
            <p className='text-xs leading-relaxed text-destructive/90'>{errorMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
