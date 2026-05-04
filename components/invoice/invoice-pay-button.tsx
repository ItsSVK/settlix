'use client'

import { useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, Loader2, Zap } from 'lucide-react'
import type { TokenInfo } from '@/components/pay/token-selector'
import { cn } from '@/lib/utils'
import { usePaymentFlow, PAY_STEP_LABELS } from '@/lib/hooks/use-payment-flow'
import type { SwapReceipt } from '@/lib/hooks/use-payment-flow'

interface InvoicePayButtonProps {
  invoiceId: string
  selectedToken: TokenInfo | null
  quoteReady: boolean
  onSuccess: (txSignature: string, swap: SwapReceipt) => void
  className?: string
}

export function InvoicePayButton({
  invoiceId,
  selectedToken,
  quoteReady,
  onSuccess,
  className,
}: InvoicePayButtonProps) {
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

  const pay = useCallback(async () => {
    if (!connected || !publicKey) {
      requestWalletConnection()
      return
    }
    if (!selectedToken || !quoteReady) return

    try {
      setStep('building')
      const orderRes = await fetch('/api/checkout/pay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputMint: selectedToken.mint, taker: publicKey.toBase58(), invoiceId }),
      })
      const orderData = await orderRes.json()
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to build transaction')

      const { transaction: txBase64, requestId, isDirect, inAmount, outAmount } = orderData
      const executionId = crypto.randomUUID()
      const paymentContext = {
        executionId,
        source: 'invoice',
        invoiceId,
        userWallet: publicKey.toBase58(),
        inputToken: selectedToken.mint,
        inAmount,
      }

      await signAndExecute(
        txBase64,
        async (signedBase64) => {
          if (isDirect) {
            const res = await fetch('/api/checkout/pay/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ signedTransaction: signedBase64, ...paymentContext }),
            })
            const body = await res.json()
            if (!res.ok || body.status !== 'Success') throw new Error(body.error || 'Direct transfer failed')
            return {
              status: 'Success',
              signature: body.signature,
              inputAmountResult: inAmount,
              outputAmountResult: outAmount,
            }
          } else {
            const res = await fetch('/api/checkout/pay/execute', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ signedTransaction: signedBase64, requestId, ...paymentContext }),
            })
            if (!res.ok) throw new Error('Execution failed')
            return res.json()
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
    invoiceId,
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
        Connect Wallet to Pay
      </button>
    )
  }

  return (
    <div className='space-y-2'>
      <button
        onClick={pay}
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
        {PAY_STEP_LABELS[step]}
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
