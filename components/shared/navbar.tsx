'use client'

import Link from 'next/link'
import { useAuth } from '@/components/auth/auth-context'
import { ConnectButton } from '@/components/auth/connect-button'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import { AnimatedThemeButton } from '@/components/shared/animated-theme-button'
import { useTheme } from 'next-themes'
import { DashboardButton } from '@/components/shared/dashboard-button'
import { SendButton } from '@/components/shared/send-button'
import { LogoutButton } from '@/components/shared/logout-button'

export function Navbar({ className }: { className?: string }) {
  const { wallet, isLoading } = useAuth()
  const pathname = usePathname()

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
        Settl<span className='text-primary'>i</span>X
      </Link>

      <div className='flex-1' />

      {pathname.startsWith('/pay') || pathname.startsWith('/send') ? (
        <AnimatedThemeButton className='md:hidden' isDark={isDark} />
      ) : isLoading ? (
        <div className='h-[36px] w-28 rounded-[15px] bg-muted/60' aria-hidden />
      ) : wallet ? (
        <>
          <SendButton />
          <DashboardButton />
          <AnimatedThemeButton className='md:hidden' isDark={isDark} />
          <LogoutButton />
        </>
      ) : (
        <span className='flex items-center gap-2'>
          <SendButton />
          <ConnectButton className='h-[36px] rounded-[15px] border-0 bg-white px-5 py-0 text-[13px] text-black hover:bg-neutral-200 hover:shadow-none' />
          <AnimatedThemeButton className='md:hidden' isDark={isDark} />
        </span>
      )}
    </nav>
  )
}
