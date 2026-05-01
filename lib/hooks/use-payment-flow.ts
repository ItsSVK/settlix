'use client'

import { useState, useCallback, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { VersionedTransaction } from '@solana/web3.js'

export type PayStep = 'idle' | 'building' | 'signing' | 'executing' | 'done' | 'error'

export const PAY_STEP_LABELS: Record<PayStep, string> = {
  idle: 'Pay Now',
  building: 'Building transaction…',
  signing: 'Waiting for signature…',
  executing: 'Submitting to network…',
  done: 'Payment complete!',
  error: 'Transaction failed',
}

export interface SwapReceipt {
  inputAmount: string
  inputDecimals: number
  inputSymbol: string
}

interface ExecuteResult {
  status: string
  signature: string
  inputAmountResult?: string
  outputAmountResult?: string
}

interface UsePaymentFlowOptions {
  onSuccess: (txSignature: string, swap: SwapReceipt) => void
}

export function usePaymentFlow({ onSuccess }: UsePaymentFlowOptions) {
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

  // Reset connectRequested when modal is dismissed without connecting
  useEffect(() => {
    if (!connectRequested || connected) return
    if (!visible && !wallet && !connecting) {
      queueMicrotask(() => {
        setConnectRequested(false)
        setStep('idle')
      })
    }
  }, [connectRequested, connected, visible, wallet, connecting])

  // Auto-trigger after wallet connects
  useEffect(() => {
    if (!connectRequested || !connected) return
    queueMicrotask(() => {
      setConnectRequested(false)
      setStep('idle')
    })
  }, [connectRequested, connected])

  const signAndExecute = useCallback(
    async (
      txBase64: string,
      executeRequest: (signedBase64: string) => Promise<ExecuteResult>,
      swapMeta: { selectedToken: { decimals: number; symbol: string }; inAmount: string },
    ) => {
      if (!signTransaction) throw new Error('Wallet not ready')

      setStep('signing')
      const txBytes = Buffer.from(txBase64, 'base64')
      const vTx = VersionedTransaction.deserialize(txBytes)
      const signedTx = await signTransaction(vTx)
      const signedBase64 = Buffer.from(signedTx.serialize()).toString('base64')

      setStep('executing')
      const execData = await executeRequest(signedBase64)
      if (execData.status !== 'Success') throw new Error('Transaction did not succeed')

      setStep('done')
      onSuccess(execData.signature, {
        inputAmount: execData.inputAmountResult ?? swapMeta.inAmount,
        inputDecimals: swapMeta.selectedToken.decimals,
        inputSymbol: swapMeta.selectedToken.symbol,
      })
    },
    [signTransaction, onSuccess],
  )

  const handleError = useCallback((e: unknown) => {
    setErrorMsg(e instanceof Error ? e.message : 'Something went wrong')
    setStep('error')
    setTimeout(() => setStep('idle'), 4000)
  }, [])

  const isLoading = ['building', 'signing', 'executing'].includes(step)

  return {
    step,
    setStep,
    errorMsg,
    isLoading,
    connected,
    publicKey,
    signTransaction,
    requestWalletConnection,
    signAndExecute,
    handleError,
  }
}
