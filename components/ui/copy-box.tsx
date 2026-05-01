'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { copyText } from '@/lib/utils'

interface CopyBoxProps {
  value: string
  wrap?: boolean
}

export function CopyBox({ value, wrap = false }: CopyBoxProps) {
  const [copied, setCopied] = useState(false)

  return (
    <div className='flex items-center gap-2 rounded-2xl border border-border/50 bg-background/50 p-3 ring-1 ring-border/20'>
      <span className={`ml-2 flex-1 font-mono text-sm text-muted-foreground ${wrap ? 'break-all' : 'truncate'}`}>
        {value}
      </span>
      <Button
        onClick={() => copyText(value, setCopied)}
        variant='secondary'
        size='sm'
        className={`shrink-0 rounded-xl px-4 font-medium transition-all ${
          copied ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : ''
        }`}
      >
        {copied ? 'Copied!' : 'Copy'}
      </Button>
    </div>
  )
}
