'use client'

import Link from 'next/link'
import { LayoutDashboard, LogOut, Send } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-context'
import { ConnectButton } from '@/components/auth/connect-button'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatedThemeButton } from '@/components/shared/animated-theme-button'
import { useTheme } from 'next-themes'

export function Navbar({ className }: { className?: string }) {
  const { wallet, logout, isLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <nav
      className={cn(
        'fixed top-4 left-1/2 z-50 flex w-[80%] max-w-5xl -translate-x-1/2 items-center md:gap-3 rounded-2xl border border-border/50 bg-background/80 px-5 py-3 shadow-lg backdrop-blur-md',
        className,
      )}
    >
      <Link href='/' className='mr-2 text-base font-bold tracking-tight text-foreground'>
        Settl<span className='text-primary'>e</span>X
      </Link>

      <div className='flex-1' />

      {pathname.startsWith('/pay') || pathname.startsWith('/send') ? (
        <AnimatedThemeButton className='md:hidden' isDark={isDark} />
      ) : isLoading ? (
        <div className='h-[36px] w-28 rounded-[15px] bg-muted/60' aria-hidden />
      ) : wallet ? (
        <>
          <Button
            className='relative inline-flex md:min-w-25 items-center gap-2 rounded-xl bg-background px-3 py-2 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-accent hover:text-foreground'
            onClick={() => router.push('/dashboard')}
          >
            <LayoutDashboard className='h-4 w-4' />
            <span className='hidden md:block'>Dashboard</span>
          </Button>

          <AnimatedThemeButton className='md:hidden' isDark={isDark} />

          <Button
            onClick={logout}
            className='relative inline-flex md:min-w-25 items-center gap-2 rounded-xl bg-background px-3 py-2 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-accent hover:text-foreground'
          >
            <LogOut className='h-4 w-4' />
            <span className='hidden md:block'>Logout</span>
          </Button>
        </>
      ) : (
        <span className='flex items-center gap-2'>
          <Button
            onClick={() => router.push('/send')}
            disabled={false}
            className={cn(
              'relative inline-flex items-center gap-2 rounded-xl bg-background sm:min-w-15 sm:px-3 px-2 py-2 text-sm font-semibold text-foreground',
              'transition-all duration-200 hover:bg-accent',
              'disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer justify-center',
              className,
            )}
          >
            <Send className='h-3.5 w-3.5' />
            <span className='hidden sm:inline'>Send</span>
          </Button>
          <ConnectButton className='h-[36px] rounded-[15px] border-0 bg-white px-5 py-0 text-[13px] text-black hover:bg-neutral-200 hover:shadow-none' />
          <AnimatedThemeButton className='md:hidden' isDark={isDark} />
        </span>
      )}
    </nav>
  )
}
