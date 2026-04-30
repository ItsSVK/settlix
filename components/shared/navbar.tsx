'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import { AnimatedThemeButton } from '@/components/shared/animated-theme-button'
import { useTheme } from 'next-themes'
import { Blocks, BookOpen } from 'lucide-react'

export function Navbar({ className }: { className?: string }) {
  const pathname = usePathname()

  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <nav
      className={cn(
        'fixed top-4 min-h-16 left-1/2 z-50 flex w-[80%] max-w-5xl -translate-x-1/2 items-center md:gap-3 rounded-2xl border border-border/50 bg-background/80 px-5 py-3 shadow-lg backdrop-blur-md',
        className,
      )}
    >
      <Link href='/' className='mr-2 text-base font-bold tracking-tight text-foreground'>
        Settl<span className='text-primary'>i</span>X
      </Link>

      <div className='flex-1' />
      <AnimatedThemeButton className='md:hidden' isDark={isDark} />
      <>
        {(pathname == '/' || pathname == '/auth') && (
          <Link
            href='/docs'
            className='flex h-8 w-8 items-center justify-center rounded-[15px] border-0 border-foreground md:bg-gray-200 font-medium md:text-foreground transition-colors hover:bg-muted md:h-[36px] md:w-[100px] text-[13px] dark:text-foreground dark:bg-background'
          >
            <BookOpen className='h-4 w-4 md:mr-2' />
            <span className='hidden md:flex'>Docs</span>
          </Link>
        )}
        {(pathname == '/' || pathname == '/docs') && (
          <Link
            href='/dashboard'
            className='flex h-8 w-8 items-center justify-center rounded-[15px] border-0 border-foreground md:bg-primary font-medium md:text-primary-foreground transition-colors hover:bg-primary/80 md:h-[36px] md:w-[100px] text-[13px]'
          >
            <Blocks className='h-4 w-4 md:mr-2' />
            <span className='hidden md:flex'>App</span>
          </Link>
        )}
      </>
    </nav>
  )
}
