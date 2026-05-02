interface StepProps {
  n: number
  title: string
  children: React.ReactNode
}

export function Step({ n, title, children }: StepProps) {
  return (
    <div className='flex gap-5'>
      <div className='flex flex-col items-center'>
        <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 dark:bg-indigo-400/10 text-[12px] font-bold text-indigo-500 dark:text-indigo-400 ring-1 ring-indigo-500/20 dark:ring-indigo-400/20'>
          {n}
        </div>
        <div className='mt-3 w-px flex-1 bg-border/50' />
      </div>
      <div className='pb-10 flex-1 min-w-0'>
        <p className='mb-4 text-base font-medium tracking-tight text-foreground'>{title}</p>
        <div className='space-y-4'>{children}</div>
      </div>
    </div>
  )
}
