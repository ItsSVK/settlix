'use client'

import { motion } from 'motion/react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts'
import type { TopLink } from '@/lib/hooks/use-dashboard-stats'

interface TopLinksChartProps {
  data: TopLink[]
  loading?: boolean
  className?: string
}

function truncate(str: string | null, max: number) {
  if (!str) return 'Untitled'
  return str.length > max ? str.slice(0, max) + '…' : str
}

export function TopLinksChart({ data, loading = false, className }: TopLinksChartProps) {
  if (loading) {
    return (
      <div className={`rounded-2xl border border-border/50 bg-background/50 p-6 backdrop-blur-xl shadow-sm${className ? ` ${className}` : ''}`}>
        <div className='mb-5 space-y-2'>
          <div className='h-5 w-32 rounded-md bg-muted animate-pulse' />
          <div className='h-3.5 w-48 rounded-md bg-muted animate-pulse' />
        </div>
        <div className='h-[220px] w-full rounded-xl bg-muted/50 animate-pulse' />
      </div>
    )
  }

  const chartData = data.map((l) => ({ ...l, name: truncate(l.title, 14) }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5, ease: 'easeOut' }}
      className={`rounded-2xl border border-border/50 bg-background/50 p-6 backdrop-blur-xl shadow-sm flex flex-col${className ? ` ${className}` : ''}`}
    >
      <div className='mb-5'>
        <h2 className='text-lg font-semibold text-foreground'>Top Payment Links</h2>
        <p className='text-sm text-muted-foreground'>By USDC volume collected</p>
      </div>

      <div className='flex-1 min-h-[220px] w-full'>
        {chartData.length === 0 ? (
          <div className='flex h-full items-center justify-center'>
            <p className='text-sm text-muted-foreground'>No payment links yet</p>
          </div>
        ) : (
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }} barSize={28}>
              <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='var(--color-border)' strokeOpacity={0.5} />
              <XAxis
                dataKey='name'
                stroke='var(--color-muted-foreground)'
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={6}
              />
              <YAxis
                stroke='var(--color-muted-foreground)'
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as TopLink & { name: string }
                    return (
                      <div className='rounded-xl border border-border/50 bg-background/95 p-3 shadow-xl backdrop-blur-md'>
                        <p className='mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                          {item.title ?? 'Untitled'}
                        </p>
                        <p className='text-base font-bold text-foreground'>
                          $
                          {item.volume.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                        <p className='text-xs text-muted-foreground'>{item.paidCount} payments</p>
                      </div>
                    )
                  }
                  return null
                }}
                cursor={{ fill: 'var(--color-muted)', opacity: 0.3 }}
              />
              <Bar dataKey='volume' radius={[6, 6, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill='var(--color-primary)' opacity={1 - i * 0.15} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  )
}
