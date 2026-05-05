'use client'

import { motion } from 'motion/react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { SubscriptionStats } from '@/lib/hooks/use-dashboard-stats'

const SEGMENTS = [
  { key: 'active' as const, label: 'Active', color: '#10b981' },
  { key: 'past_due' as const, label: 'Past Due', color: '#f59e0b' },
  { key: 'cancelled' as const, label: 'Cancelled', color: '#ef4444' },
]

interface SubscriberStatusChartProps {
  data: SubscriptionStats
  loading?: boolean
}

export function SubscriberStatusChart({ data, loading = false }: SubscriberStatusChartProps) {
  if (loading) {
    return (
      <div className='rounded-2xl border border-border/50 bg-background/50 p-6 backdrop-blur-xl shadow-sm'>
        <div className='mb-5 space-y-2'>
          <div className='h-5 w-32 rounded-md bg-muted animate-pulse' />
          <div className='h-3.5 w-28 rounded-md bg-muted animate-pulse' />
        </div>
        <div className='flex items-center gap-6'>
          <div className='h-[160px] w-[160px] rounded-full bg-muted animate-pulse' />
          <div className='space-y-3 flex-1'>
            {[0, 1, 2].map((i) => (
              <div key={i} className='h-4 rounded-md bg-muted animate-pulse' />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const total = data.active + data.past_due + data.cancelled
  const chartData = SEGMENTS.map((s) => ({ ...s, value: data[s.key] })).filter((s) => s.value > 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6, ease: 'easeOut' }}
      className='rounded-2xl border border-border/50 bg-background/50 p-6 backdrop-blur-xl shadow-sm'
    >
      <div className='mb-5'>
        <h2 className='text-lg font-semibold text-foreground'>Subscriber Status</h2>
        <p className='text-sm text-muted-foreground'>{total} total subscribers</p>
      </div>

      {total === 0 ? (
        <div className='flex h-[160px] items-center justify-center'>
          <p className='text-sm text-muted-foreground'>No subscribers yet</p>
        </div>
      ) : (
        <div className='flex items-center gap-4'>
          <div className='h-[160px] w-[160px] shrink-0'>
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Pie
                  data={chartData}
                  cx='50%'
                  cy='50%'
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey='value'
                  strokeWidth={0}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as (typeof chartData)[number]
                      return (
                        <div className='rounded-xl border border-border/50 bg-background/95 p-3 shadow-xl backdrop-blur-md'>
                          <p className='text-sm font-medium text-foreground'>{item.label}</p>
                          <p className='text-lg font-bold text-foreground'>{item.value}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className='flex-1 space-y-3'>
            {SEGMENTS.map((s) => (
              <div key={s.key} className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <span className='h-2.5 w-2.5 rounded-full' style={{ backgroundColor: s.color }} />
                  <span className='text-sm text-muted-foreground'>{s.label}</span>
                </div>
                <span className='text-sm font-semibold text-foreground'>{data[s.key]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
