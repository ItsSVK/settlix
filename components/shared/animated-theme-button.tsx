'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Moon, Sun } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useTheme } from 'next-themes'

const iconTransition = {
  duration: 0.28,
  ease: [0.4, 0, 0.2, 1] as const,
}

export function AnimatedThemeButton({ isDark, className }: { isDark: boolean; className?: string }) {
  const { setTheme } = useTheme()
  const modeLabel = isDark ? 'Light mode' : 'Dark mode'

  return (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      className={cn(
        'size-9 shrink-0 rounded-full',
        'text-foreground hover:bg-muted/90',
        'transition-[color,background-color] duration-300 ease-out',
        className,
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
  )
}
