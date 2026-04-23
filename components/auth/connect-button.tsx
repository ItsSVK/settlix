'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-context'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ConnectButtonProps {
  className?: string
  onSuccess?: () => void
}

type Step = 'idle' | 'selecting' | 'connecting' | 'signing' | 'done'

export function ConnectButton({ className, onSuccess }: ConnectButtonProps) {
  const { wallet, connected, connecting, publicKey, connect } = useWallet()
  const { visible, setVisible } = useWalletModal()
  const { wallet: sessionWallet, login } = useAuth()
  const [step, setStep] = useState<Step>('idle')
  const [connectRequested, setConnectRequested] = useState(false)
  const loginStartedRef = useRef(false)

  const beginLogin = useCallback(async () => {
    if (loginStartedRef.current) return
    loginStartedRef.current = true

    try {
      setStep('signing')
      await login()
      setStep('done')
      setConnectRequested(false)
      onSuccess?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sign-in failed')
      setStep('idle')
      setConnectRequested(false)
    } finally {
      loginStartedRef.current = false
    }
  }, [login, onSuccess])

  const handleClick = useCallback(async () => {
    if (sessionWallet) return

    if (connected && publicKey) {
      await beginLogin()
      return
    }

    setConnectRequested(true)

    if (!wallet) {
      setStep('selecting')
      setVisible(true)
      return
    }
    try {
      setStep('connecting')
      await connect()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Wallet connection failed')
      setStep('idle')
      setConnectRequested(false)
    }
  }, [sessionWallet, connected, publicKey, beginLogin, wallet, setVisible, connect])

  useEffect(() => {
    if (!connectRequested || step === 'signing' || step === 'done') return

    if (connected && publicKey && !loginStartedRef.current) {
      queueMicrotask(() => {
        void beginLogin()
      })
      return
    }

    if (!visible && !wallet && !connecting) {
      queueMicrotask(() => {
        setStep('idle')
        setConnectRequested(false)
      })
    }
  }, [connectRequested, step, connected, publicKey, visible, wallet, connecting, beginLogin])

  // Already authenticated
  if (sessionWallet) return null

  const resolvedStep: Step =
    step === 'signing' || step === 'done'
      ? step
      : connectRequested && visible && !wallet
      ? 'selecting'
      : connectRequested && (connecting || (!!wallet && !connected))
      ? 'connecting'
      : 'idle'

  const labels: Record<Step, string> = {
    idle: connected ? 'Sign in' : 'Connect Wallet',
    selecting: 'Choose wallet…',
    connecting: 'Opening wallet…',
    signing: 'Sign the message…',
    done: 'Signed in!',
  }

  const mobileLabels: Record<Step, string> = {
    idle: connected ? 'Sign' : 'Connect',
    selecting: 'Choose…',
    connecting: 'Opening…',
    signing: 'Signing…',
    done: 'Done!',
  }

  const isLoading = resolvedStep === 'selecting' || resolvedStep === 'connecting' || resolvedStep === 'signing'

  return (
    <button
      onClick={handleClick}
      disabled={isLoading || resolvedStep === 'done'}
      className={cn(
        'relative inline-flex items-center gap-2 rounded-xl bg-background min-w-25 px-3 py-2 text-sm font-semibold text-foreground',
        'transition-all duration-200 hover:bg-accent',
        'disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer justify-center',
        className,
      )}
    >
      {isLoading && <Loader2 className='h-4 w-4 animate-spin' />}
      <span className='hidden sm:inline'>{labels[resolvedStep]}</span>
      <span className='sm:hidden'>{mobileLabels[resolvedStep]}</span>
    </button>
  )
}
