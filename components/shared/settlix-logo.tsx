import { cn } from '@/lib/utils'

export function SettlixLogoConcise({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg' className={className}>
      <defs>
        <linearGradient id='primary-gradient' x1='0%' y1='100%' x2='100%' y2='0%'>
          <stop offset='0%' className='text-primary' stopColor='currentColor' />
          <stop offset='100%' className='text-primary/40' stopColor='currentColor' />
        </linearGradient>
      </defs>
      <path
        d='M16 6 Q 6 6 10 10'
        stroke='currentColor'
        strokeWidth='6'
        strokeLinecap='round'
        className='text-foreground'
      />
      <path
        d='M16 26 Q 26 26 22 22'
        stroke='currentColor'
        strokeWidth='6'
        strokeLinecap='round'
        className='text-foreground'
      />
      <path d='M6 26L26 6' stroke='url(#primary-gradient)' strokeWidth='6' strokeLinecap='round' />
    </svg>
  )
}

export function SettlixLogo({ className }: { className?: string }) {
  return (
    <div className='group/logo flex items-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]'>
      <SettlixLogoConcise className={cn('transition-transform duration-500 group-hover/logo:rotate-180', className)} />
      <span className='group-data-[collapsible=icon]:hidden text-xl font-bold tracking-tight truncate'>
        Settl<span className='text-primary'>i</span>X
      </span>
    </div>
  )
}
