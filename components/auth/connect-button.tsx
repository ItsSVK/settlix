'use client'

import { useState, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-context'
import { cn } from '@/lib/utils'

interface ConnectButtonProps {
  className?: string
  onSuccess?: () => void
}

type Step = 'idle' | 'connecting' | 'signing' | 'done' | 'error'

export function ConnectButton({ className, onSuccess }: ConnectButtonProps) {
  const { connected, publicKey } = useWallet()
  const { setVisible } = useWalletModal()
  const { wallet: sessionWallet, login } = useAuth()
  const [step, setStep] = useState<Step>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleClick = useCallback(async () => {
    setErrorMsg('')

    if (!connected || !publicKey) {
      setStep('connecting')
      setVisible(true)
      return
    }

    // Wallet is connected but not signed in yet
    try {
      setStep('signing')
      await login()
      setStep('done')
      onSuccess?.()
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Sign-in failed')
      setStep('error')
      setTimeout(() => setStep('idle'), 3000)
    }
  }, [connected, publicKey, login, onSuccess, setVisible])

  // Already authenticated
  if (sessionWallet) return null

  const labels: Record<Step, string> = {
    idle: connected ? 'Sign in' : 'Connect Wallet',
    connecting: 'Opening wallet…',
    signing: 'Sign the message…',
    done: 'Signed in!',
    error: errorMsg || 'Error',
  }

  const isLoading = step === 'connecting' || step === 'signing'

  return (
    <button
      onClick={handleClick}
      disabled={isLoading || step === 'done'}
      className={cn(
        'relative inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-background px-6 py-3 text-sm font-semibold text-foreground',
        'transition-all duration-200 hover:border-primary hover:bg-primary/10 hover:shadow-[0_0_20px_rgba(109,40,217,0.15)]',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
    >
      {isLoading && <Loader2 className='h-4 w-4 animate-spin' />}
      {labels[step]}
    </button>
  )
}
