'use client'

import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyBox } from '@/components/ui/copy-box'

interface DialogSuccessProps {
  title: string
  subtitle: string
  url: string
  onDone: () => void
}

export function DialogSuccess({ title, subtitle, url, onDone }: DialogSuccessProps) {
  return (
    <div className='space-y-6'>
      <div className='flex flex-col items-center justify-center rounded-2xl border border-border/30 bg-muted/10 py-6'>
        <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-500'>
          <Check className='h-6 w-6' />
        </div>
        <p className='text-sm font-medium tracking-tight text-foreground'>{title}</p>
        <p className='mt-1 text-xs text-muted-foreground'>{subtitle}</p>
      </div>
      <CopyBox value={url} />
      <Button
        type='button'
        onClick={onDone}
        className='relative mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-background transition-all hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:text-foreground'
      >
        Done
      </Button>
    </div>
  )
}
