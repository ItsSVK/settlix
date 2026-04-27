import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Button } from '../ui/button'
import { Loader2, Trash2 } from 'lucide-react'

interface ArchiveItemProps {
  handleArchive: (id: string) => Promise<void> | void
  archiving: string | null
  item: { id: string }
  type: string
  confirmArchive: string | null
  setConfirmArchive: (id: string | null) => void
}

export default function ArchiveItem({
  handleArchive,
  archiving,
  item,
  type,
  confirmArchive,
  setConfirmArchive,
}: ArchiveItemProps) {
  const prefersReducedMotion = useReducedMotion()
  const isConfirming = confirmArchive === item.id
  const transition = prefersReducedMotion ? { duration: 0 } : { type: 'spring' as const, bounce: 0, duration: 0.28 }
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isConfirming && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setConfirmArchive(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isConfirming, setConfirmArchive])

  return (
    <div 
      ref={containerRef} 
      className='relative z-10 flex h-10 w-10 shrink-0 items-center justify-end overflow-visible'
      onBlur={(e) => {
        if (isConfirming && !e.currentTarget.contains(e.relatedTarget)) {
          setConfirmArchive(null)
        }
      }}
    >
      <AnimatePresence initial={false}>
        {isConfirming ? (
          <motion.div
            key='confirm'
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scaleX: 0.84, x: 10 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scaleX: 1, x: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scaleX: 0.92, x: 10 }}
            transition={transition}
            style={{ transformOrigin: 'right center' }}
            className='absolute right-0 top-1/2 -translate-y-1/2 overflow-hidden whitespace-nowrap rounded-2xl'
          >
            <div
              aria-hidden
              className='pointer-events-none absolute inset-0 bg-linear-to-l from-card/96 via-card/88 to-transparent'
            />
            <div aria-hidden className='pointer-events-none absolute inset-y-0 right-0 left-6 rounded-2xl bg-card' />

            <div className='relative flex min-h-10 items-center gap-1 px-1.5 pl-20 rounded-2xl'>
              <span className='px-1 text-[11px] font-medium text-destructive'>{type}?</span>
              <Button
                onClick={() => void handleArchive(item.id)}
                disabled={archiving === item.id}
                size='sm'
                variant='ghost'
                className='h-8 rounded-lg px-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive'
              >
                {archiving === item.id ? <Loader2 className='h-3 w-3 animate-spin' /> : 'Yes'}
              </Button>
              <Button
                onClick={() => setConfirmArchive(null)}
                size='sm'
                variant='ghost'
                className='h-8 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50'
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key='idle'
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, x: -4 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, x: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, x: 4 }}
            transition={transition}
            className='absolute right-0 top-1/2 -translate-y-1/2'
          >
            <Button
              onClick={() => setConfirmArchive(item.id)}
              size='sm'
              variant='ghost'
              aria-label={`${type} key`}
              title={`${type} key`}
              className='h-10 w-10 rounded-xl p-0 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground'
            >
              <Trash2 className='h-3.5 w-3.5 text-red-500' />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
