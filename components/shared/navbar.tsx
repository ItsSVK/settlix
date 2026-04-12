'use client'

import Link from 'next/link'
import { LayoutDashboard, LogOut } from 'lucide-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useAuth } from '@/components/auth/auth-context'
import { cn } from '@/lib/utils'
import { useWallet } from '@solana/wallet-adapter-react'

import { motion, AnimatePresence } from 'motion/react'
import { ConnectButton } from '@/components/auth/connect-button'
import { Button } from '@/components/ui/button'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export function Navbar({ className }: { className?: string }) {
  const { wallet, logout } = useAuth()
  const { connected } = useWallet()
  const router = useRouter()
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <nav
      className={cn(
        'fixed top-4 left-1/2 z-50 flex w-[80%] max-w-5xl -translate-x-1/2 items-center gap-3 rounded-2xl border border-border/50 bg-background/80 px-5 py-3 shadow-lg backdrop-blur-md',
        className,
      )}
    >
      <Link href='/' className='mr-2 text-base font-bold tracking-tight text-foreground'>
        Settl<span className='text-primary'>e</span>X
      </Link>

      <div className='flex-1' />

      {isMounted && wallet && (
        <>
          <Button
            onClick={() => router.push('/dashboard')}
            className={cn(
              'relative inline-flex items-center gap-2 rounded-xl bg-background min-w-25 px-3 py-2 text-sm font-semibold text-foreground',
              'transition-all duration-200 hover:bg-accent hover:text-foreground',
              'disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer',
              className,
            )}
          >
            <LayoutDashboard className='h-4 w-4' />
            Dashboard
          </Button>
          <Button
            onClick={logout}
            className={cn(
              'relative inline-flex items-center gap-2 rounded-xl bg-background min-w-25 px-3 py-2 text-sm font-semibold text-foreground',
              'transition-all duration-200 hover:bg-accent hover:text-foreground',
              'disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer',
              className,
            )}
          >
            <LogOut className='h-4 w-4' />
            Logout
          </Button>
        </>
      )}

      <AnimatePresence mode='popLayout'>
        {isMounted && !wallet && (
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className='flex items-center gap-2'
          >
            <AnimatePresence>
              {connected && !pathname.startsWith('/pay/') && (
                <motion.div
                  layout
                  initial={{ opacity: 0, width: 0, scale: 0.8 }}
                  animate={{ opacity: 1, width: 'auto', scale: 1 }}
                  exit={{ opacity: 0, width: 0, scale: 0.8 }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  className='overflow-hidden whitespace-nowrap'
                >
                  <ConnectButton className='h-[36px] rounded-[15px] bg-white text-black px-5 py-0 text-[13px] hover:bg-neutral-200 hover:shadow-none border-0' />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div layout transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}>
              <WalletMultiButton
                style={{
                  height: 36,
                  fontSize: 13,
                  borderRadius: '15px',
                  backgroundColor: '#000',
                  color: '#fff',
                  width: '150px',
                  border: '1px solid #fff',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
