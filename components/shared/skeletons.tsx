export function SkeletonRow() {
  return (
    <div className='flex items-center gap-3 rounded-xl border border-border/30 p-4'>
      <div className='h-2 w-2 animate-pulse rounded-full bg-muted' />
      <div className='h-4 flex-1 animate-pulse rounded bg-muted' />
      <div className='h-4 w-16 animate-pulse rounded bg-muted' />
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className='rounded-2xl border border-border/40 bg-card p-5 shadow-[0_6px_16px_rgba(15,23,42,0.06)] dark:shadow-none transition-all hover:scale-[1.02] hover:shadow-[0_10px_24px_rgba(15,23,42,0.1)] dark:hover:shadow-none'>
      <div className='h-4 w-24 animate-pulse rounded bg-muted' />
      <div className='mt-3 h-6 w-32 animate-pulse rounded-lg bg-muted' />
    </div>
  )
}

export function SkeletonGrid({ count = 4, cols = 4 }: { count?: number; cols?: number }) {
  return (
    <div className={`mb-8 grid grid-cols-1 gap-4 md:grid-cols-${cols}`}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
