'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { Sun, Moon, LayoutDashboard, LogOut } from 'lucide-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useAuth } from '@/components/auth/auth-context'
import { cn } from '@/lib/utils'

export function Navbar({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const { wallet, logout } = useAuth()

  return (
    <nav
      className={cn(
        'fixed top-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-border/50 bg-background/80 px-5 py-3 shadow-lg backdrop-blur-md',
        className,
      )}
    >
      <Link href='/' className='mr-2 text-base font-bold tracking-tight text-foreground'>
        Settl<span className='text-primary'>e</span>X
      </Link>

      <div className='flex-1' />

      {wallet && (
        <>
          <Link
            href='/dashboard'
            className='flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
          >
            <LayoutDashboard className='h-4 w-4' />
            Dashboard
          </Link>
          <button
            onClick={logout}
            className='flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
          >
            <LogOut className='h-4 w-4' />
            Logout
          </button>
        </>
      )}

      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label='Toggle theme'
        className='rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
      >
        {theme === 'dark' ? <Sun className='h-4 w-4' /> : <Moon className='h-4 w-4' />}
      </button>

      {!wallet && <WalletMultiButton style={{ height: 36, fontSize: 13 }} />}
    </nav>
  )
}
