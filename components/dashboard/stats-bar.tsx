'use client'

import { useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'motion/react'

export interface StatItem {
  label: string
  value: number
  format?: 'count' | 'usdc'
}

function StatCard({ label, value, format = 'count' }: StatItem) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString())

  useEffect(() => {
    const c = animate(count, value, { duration: 1, ease: 'easeOut' })
    return c.stop
  }, [value, count])

  const cardClass =
    'rounded-2xl border border-border/40 bg-card p-5 shadow-[0_6px_16px_rgba(15,23,42,0.06)] dark:shadow-none transition-all hover:scale-[1.02] hover:shadow-[0_10px_24px_rgba(15,23,42,0.1)] dark:hover:shadow-none'

  return (
    <div className={cardClass}>
      <p className='text-xs font-medium text-muted-foreground'>{label}</p>
      {format === 'usdc' ? (
        <p className='mt-1 text-3xl font-bold tracking-tight text-foreground'>
          {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      ) : (
        <motion.p className='mt-1 text-3xl font-bold tracking-tight text-foreground'>{rounded}</motion.p>
      )}
    </div>
  )
}

interface StatsBarProps {
  stats: StatItem[]
}

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  )
}
