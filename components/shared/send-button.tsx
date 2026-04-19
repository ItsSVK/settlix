'use client'
import { Button } from '../ui/button'
import { Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export const SendButton = ({ className }: { className?: string }) => {
  const router = useRouter()

  return (
    <Button
      onClick={() => router.push('/send')}
      disabled={false}
      className={cn(
        'relative inline-flex items-center gap-2 rounded-xl bg-background sm:min-w-15 sm:px-3 px-2 py-2 text-[13px] font-semibold text-foreground',
        'transition-all duration-200 hover:bg-accent',
        'disabled:cursor-not-allowed disabled:opacity-60 justify-center',
        className,
      )}
    >
      <Send className='h-3.5 w-3.5' />
      <span className='hidden sm:block'>Send</span>
    </Button>
  )
}
