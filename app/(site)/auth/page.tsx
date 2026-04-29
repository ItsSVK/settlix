'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { Wallet } from 'lucide-react'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { ConnectButton } from '@/components/auth/connect-button'
import { useAuth } from '@/components/auth/auth-context'

export default function AuthPage() {
  const { wallet, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && wallet) {
      router.replace('/dashboard')
    }
  }, [isLoading, wallet, router])

  return (
    <main className='relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-background px-6 py-24'>
      <BackgroundBeams />

      <div className='relative z-10 w-full max-w-[400px]'>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 400, damping: 30 }}
          className='relative w-full rounded-3xl border border-border/40 bg-background/60 p-8 shadow-2xl ring-1 ring-black/5 dark:ring-white/5 backdrop-blur-xl'
        >
          <div className='mb-8 text-center'>
            <div className='mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20'>
              <Wallet className='h-7 w-7' />
            </div>
            <h1 className='text-2xl font-bold tracking-tight text-foreground'>Welcome back</h1>
            <p className='mt-2 text-sm text-muted-foreground'>
              Connect your wallet and sign the message to securely access your dashboard.
            </p>
          </div>

          <div className='flex flex-col gap-4'>
            <ConnectButton className='relative flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50' />

            <p className='mt-4 text-center text-xs text-muted-foreground'>
              By connecting, you agree to our{' '}
              <a href='#' className='underline-offset-4 hover:text-foreground hover:underline'>
                Terms
              </a>{' '}
              and{' '}
              <a href='#' className='underline-offset-4 hover:text-foreground hover:underline'>
                Privacy
              </a>
              .
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  )
}
