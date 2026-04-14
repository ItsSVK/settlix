'use client'

import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { cn, copyText } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface WalletAvatarProps {
  address: string
  className?: string
}

function shorten(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`
}

export function WalletAvatar({ address, className }: WalletAvatarProps) {
  const [copied, setCopied] = useState(false)

  return (
    <Button
      onClick={() => copyText(address, setCopied)}
      className={cn(
        'flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5 text-sm font-mono text-muted-foreground transition-colors hover:bg-muted',
        className,
      )}
      size='sm'
    >
      <span className='h-2 w-2 rounded-full bg-green-500' />
      {shorten(address)}
      {copied ? <Check className='h-3 w-3 text-green-500' /> : <Copy className='h-3 w-3' />}
    </Button>
  )
}
