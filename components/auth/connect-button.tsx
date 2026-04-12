'use client'

import { useState, useCallback } from 'react'
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

type Step = 'idle' | 'connecting' | 'signing' | 'done'

export function ConnectButton({ className, onSuccess }: ConnectButtonProps) {
  const { connected, publicKey } = useWallet()
  const { setVisible } = useWalletModal()
  const { wallet: sessionWallet, login } = useAuth()
  const [step, setStep] = useState<Step>('idle')

  const handleClick = useCallback(async () => {
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
      toast.error(e instanceof Error ? e.message : 'Sign-in failed')
      setStep('idle')
    }
  }, [connected, publicKey, login, onSuccess, setVisible])

  // Already authenticated
  if (sessionWallet) return null

  const labels: Record<Step, string> = {
    idle: connected ? 'Sign in' : 'Connect Wallet',
    connecting: 'Opening wallet…',
    signing: 'Sign the message…',
    done: 'Signed in!',
  }

  const isLoading = step === 'connecting' || step === 'signing'

  return (
    <button
      onClick={handleClick}
      disabled={isLoading || step === 'done'}
      className={cn(
        'relative inline-flex items-center gap-2 rounded-xl bg-background min-w-25 px-3 py-2 text-sm font-semibold text-foreground',
        'transition-all duration-200 hover:bg-accent hover:text-foreground',
        'disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer justify-center',
        className,
      )}
    >
      {isLoading && <Loader2 className='h-4 w-4 animate-spin' />}
      {labels[step]}
    </button>
  )
}
