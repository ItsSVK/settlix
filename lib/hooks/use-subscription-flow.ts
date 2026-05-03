'use client'

import { useState, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { VersionedTransaction } from '@solana/web3.js'

export type SubscribeStep = 'idle' | 'building' | 'signing' | 'submitting' | 'done' | 'error'

export const SUBSCRIBE_STEP_LABELS: Record<SubscribeStep, string> = {
  idle: 'Subscribe',
  building: 'Preparing authorization…',
  signing: 'Waiting for signature…',
  submitting: 'Confirming on-chain…',
  done: 'Subscribed!',
  error: 'Subscription failed',
}

export interface SubscribeResult {
  id: string
  status: string
  currentPeriodEnd: string
  txSignature: string
}

interface UseSubscriptionFlowOptions {
  onSuccess: (result: SubscribeResult) => void
}

export function useSubscriptionFlow({ onSuccess }: UseSubscriptionFlowOptions) {
  const { wallet, publicKey, signTransaction, connected, connecting, connect } = useWallet()
  const { visible, setVisible } = useWalletModal()
  const [step, setStep] = useState<SubscribeStep>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [connectRequested, setConnectRequested] = useState(false)

  const handleError = useCallback((e: unknown) => {
    setErrorMsg(e instanceof Error ? e.message : 'Something went wrong')
    setStep('error')
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
      handleError(e)
      setConnectRequested(false)
    }
  }, [wallet, setVisible, connect, handleError])

  const subscribe = useCallback(
    async (linkId: string) => {
      if (!connected || !publicKey || !signTransaction) {
        requestWalletConnection()
        return
      }

      try {
        // 1. Build authorization transaction
        setStep('building')
        const authRes = await fetch('/api/subscriptions/authorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ linkId, subscriberWallet: publicKey.toBase58() }),
        })
        const authData = await authRes.json()
        if (!authRes.ok) throw new Error(authData.error ?? 'Failed to build authorization')

        // 2. Sign the transaction
        setStep('signing')
        const txBytes = Buffer.from(authData.transaction, 'base64')
        const tx = VersionedTransaction.deserialize(txBytes)
        const signedTx = await signTransaction(tx)
        const signedBase64 = Buffer.from(signedTx.serialize()).toString('base64')

        // 3. Submit and create subscription
        setStep('submitting')
        const executionId = crypto.randomUUID()
        const subRes = await fetch('/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            linkId,
            subscriberWallet: publicKey.toBase58(),
            signedTransaction: signedBase64,
            executionId,
          }),
        })
        const subData = await subRes.json()
        if (!subRes.ok || subData.status === 'Failed') {
          throw new Error(subData.error ?? 'Subscription failed on-chain')
        }

        setStep('done')
        onSuccess(subData as SubscribeResult)
      } catch (e) {
        handleError(e)
      }
    },
    [connected, publicKey, signTransaction, requestWalletConnection, onSuccess, handleError],
  )

  const isLoading = ['building', 'signing', 'submitting'].includes(step)

  return {
    step,
    errorMsg,
    isLoading,
    connected,
    publicKey,
    connectRequested,
    requestWalletConnection,
    subscribe,
    handleError,
  }
}
