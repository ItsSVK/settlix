'use client'

import { useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const iconTransition = {
  duration: 0.28,
  ease: [0.4, 0, 0.2, 1] as const,
}

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
  const { resolvedTheme, setTheme } = useTheme()

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
        'fixed top-4 right-4 z-110 flex items-center gap-2 rounded-full border border-border/90 py-1 pr-1 pl-2.5 shadow-md',
        'bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/80',
        'dark:border-border dark:bg-card/95 dark:supports-backdrop-filter:bg-card/85',
      )}
      role='group'
      aria-label={`${modeLabel}. Keyboard: D.`}
    >
      <span className='pointer-events-none hidden items-center gap-2 text-[11px] leading-none text-muted-foreground sm:flex'>
        <span className='whitespace-nowrap'>Press</span>
        <KbdD />
      </span>

      <span className='pointer-events-none flex items-center sm:hidden'>
        <KbdD />
      </span>

      <Button
        type='button'
        variant='ghost'
        size='icon'
        className={cn(
          'size-9 shrink-0 rounded-full',
          'text-foreground hover:bg-muted/90',
          'transition-[color,background-color] duration-300 ease-out',
        )}
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label={`${modeLabel} (keyboard shortcut: D)`}
        title={`${modeLabel} — or press D`}
      >
        <span className='relative grid h-4 w-4 place-items-center overflow-visible'>
          <AnimatePresence mode='popLayout' initial={false}>
            <motion.span
              key={isDark ? 'sun' : 'moon'}
              initial={{ opacity: 0, scale: 0.5, rotate: -60 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, rotate: 60 }}
              transition={iconTransition}
              className='col-start-1 row-start-1 flex items-center justify-center'
            >
              {isDark ? <Sun className='size-4' /> : <Moon className='size-4' />}
            </motion.span>
          </AnimatePresence>
        </span>
      </Button>
    </div>
  )
}
