import { BackgroundBeams } from '@/components/ui/background-beams'

interface EmptyStateProps {
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className='relative flex flex-col items-center justify-center rounded-2xl border-dashed overflow-hidden border border-border/40 bg-card backdrop-blur-sm py-20 text-center shadow-[0_6px_16px_rgba(15,23,42,0.06)] dark:shadow-none'>
      <BackgroundBeams className='opacity-20' />
      <div className='relative z-10'>
        <p className='text-lg font-semibold text-foreground'>{title}</p>
        <p className='mt-2 text-sm text-muted-foreground'>{description}</p>
        {action && <div className='mt-5 flex justify-center'>{action}</div>}
      </div>
    </div>
  )
}
