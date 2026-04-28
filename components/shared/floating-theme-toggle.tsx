'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'
import { AnimatedThemeButton } from '@/components/shared/animated-theme-button'

/** Hydration-safe “client mounted” without setState-in-effect (next-themes needs client before showing theme). */
function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

function KbdD() {
  return (
    <kbd
      className={cn(
        'inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-border/80',
        'bg-muted/90 font-mono text-[11px] font-semibold text-foreground',
        'shadow-sm dark:bg-muted/70',
      )}
    >
      D
    </kbd>
  )
}

/**
 * Fixed top-right: theme control + D shortcut (ThemeProvider). Single pill so copy stays legible over the canvas.
 */
export function FloatingThemeToggle() {
  const mounted = useIsClient()
  const { resolvedTheme } = useTheme()
  const pathname = usePathname()

  if (pathname.startsWith('/embed/') || pathname.startsWith('/dashboard')) return null

  if (!mounted) {
    return (
      <div
        className='pointer-events-none fixed top-4 right-4 z-110 h-11 w-36 rounded-full sm:top-5 sm:right-5'
        aria-hidden
      />
    )
  }

  const isDark = resolvedTheme === 'dark'
  const modeLabel = isDark ? 'Light mode' : 'Dark mode'

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-110 flex items-center gap-2 rounded-full border border-border/90 2xl:py-1 2xl:pr-1 2xl:pl-2.5 shadow-md',
        'bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/80',
        'dark:border-border dark:bg-card/95 dark:supports-backdrop-filter:bg-card/85',
        'hidden md:flex',
      )}
      role='group'
      aria-label={`${modeLabel}. Keyboard: D.`}
    >
      <span className='pointer-events-none hidden items-center gap-2 text-[11px] leading-none text-muted-foreground 2xl:flex'>
        <span className='whitespace-nowrap'>Press</span>
        <KbdD />
      </span>

      <AnimatedThemeButton isDark={isDark} />
    </div>
  )
}
