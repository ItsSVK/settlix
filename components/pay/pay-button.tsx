'use client'

import { useState, useCallback, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { VersionedTransaction } from '@solana/web3.js'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, Loader2, Zap } from 'lucide-react'
import type { TokenInfo } from './token-selector'
import { cn } from '@/lib/utils'

interface SwapReceipt {
  inputAmount: string
  inputDecimals: number
  inputSymbol: string
}

interface PayButtonProps {
  linkId: string
  selectedToken: TokenInfo | null
  quoteReady: boolean
  onSuccess: (txSignature: string, swap: SwapReceipt) => void
  className?: string
}

type PayStep = 'idle' | 'building' | 'signing' | 'executing' | 'done' | 'error'

const stepLabels: Record<PayStep, string> = {
  idle: 'Pay Now',
  building: 'Building transaction…',
  signing: 'Waiting for signature…',
  executing: 'Submitting to network…',
  done: 'Payment complete!',
  error: 'Transaction failed',
}

export function PayButton({ linkId, selectedToken, quoteReady, onSuccess, className }: PayButtonProps) {
  const { wallet, publicKey, signTransaction, connected, connecting, connect } = useWallet()
  const { visible, setVisible } = useWalletModal()
  const [step, setStep] = useState<PayStep>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [connectRequested, setConnectRequested] = useState(false)

  const showConnectError = useCallback((message: string) => {
    setErrorMsg(message)
    setStep('error')
    setConnectRequested(false)
    setTimeout(() => setStep('idle'), 4000)
  }, [])

  const requestWalletConnection = useCallback(async () => {
    setErrorMsg('')
    setConnectRequested(true)

    if (!wallet) {
      setVisible(true)
      return
    }

    try {
      await connect()
    } catch (e) {
      showConnectError(e instanceof Error ? e.message : 'Wallet connection failed')
    }
  }, [wallet, setVisible, connect, showConnectError])

  const pay = useCallback(async () => {
    if (!connected || !publicKey) {
      requestWalletConnection()
      return
    }
    if (!selectedToken || !quoteReady || !signTransaction) return

    setErrorMsg('')
    try {
      // 1. Build the order (Jupiter swap OR direct transfer if same-mint)
      setStep('building')
      const orderRaw = await fetch('/api/jupiter/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputMint: selectedToken.mint,
          taker: publicKey.toBase58(),
          payId: linkId,
        }),
      })
      const orderData = await orderRaw.json()
      if (!orderRaw.ok) throw new Error(orderData.error || 'Failed to build transaction')

      const { transaction: txBase64, requestId, isDirect, inAmount, outAmount } = orderData

      // 2. Deserialise + sign
      setStep('signing')
      const txBytes = Buffer.from(txBase64, 'base64')
      const vTx = VersionedTransaction.deserialize(txBytes)
      const signedTx = await signTransaction(vTx)
      const signedBase64 = Buffer.from(signedTx.serialize()).toString('base64')

      // Payment context sent with execute/send so the server records atomically.
      // No separate /api/submit-tx call — eliminates the race where a closed tab
      // leaves a confirmed on-chain tx unrecorded.
      const executionId = crypto.randomUUID()
      const paymentContext = {
        executionId,
        linkId,
        userWallet: publicKey.toBase58(),
        inputToken: selectedToken.mint,
        inAmount,
      }

      // 3. Execute:
      //    isDirect = true  → same-mint payment, submit straight to Solana RPC (no Jupiter swap needed)
      //    isDirect = false → Jupiter swap, go through Jupiter's /execute
      setStep('executing')
      let execData: { status: string; signature: string; inputAmountResult?: string; outputAmountResult?: string }

      if (isDirect) {
        const res = await fetch('/api/solana/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signedTransaction: signedBase64, ...paymentContext }),
        })
        const body = await res.json()
        if (!res.ok || body.status !== 'Success') throw new Error(body.error || 'Direct transfer failed')
        execData = {
          status: 'Success',
          signature: body.signature,
          inputAmountResult: inAmount,
          outputAmountResult: outAmount,
        }
      } else {
        const res = await fetch('/api/jupiter/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signedTransaction: signedBase64, requestId, ...paymentContext }),
        })
        if (!res.ok) throw new Error('Execution failed')
        execData = await res.json()
        if (execData.status !== 'Success') throw new Error('Transaction did not succeed')
      }

      setStep('done')
      onSuccess(execData.signature, {
        inputAmount: execData.inputAmountResult ?? inAmount,
        inputDecimals: selectedToken.decimals,
        inputSymbol: selectedToken.symbol,
      })
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong')
      setStep('error')
      setTimeout(() => setStep('idle'), 4000)
    }
  }, [connected, publicKey, selectedToken, quoteReady, signTransaction, linkId, onSuccess, requestWalletConnection])

  useEffect(() => {
    if (!connectRequested || connected) return

    if (!visible && !wallet && !connecting) {
      queueMicrotask(() => {
        setConnectRequested(false)
        setStep('idle')
      })
    }
  }, [connectRequested, connected, visible, wallet, connecting])

  useEffect(() => {
    if (!connectRequested || !connected) return

    queueMicrotask(() => {
      setConnectRequested(false)
      setStep('idle')
    })
  }, [connectRequested, connected])

  const isLoading = ['building', 'signing', 'executing'].includes(step)
  const isDisabled = isLoading || step === 'done' || (!connected && false) || !selectedToken || !quoteReady

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
        {stepLabels[step]}
      </button>

      {/* Error message — fades + slides in for the same 4s window the button is red */}
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
