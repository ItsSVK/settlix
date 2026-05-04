'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import type { RevenueDay } from '@/lib/hooks/use-dashboard-stats'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(dateStr: string) {
  const [, month, day] = dateStr.split('-').map(Number)
  return `${MONTHS[month - 1]} ${day}`
}

type Range = '7d' | '30d'

interface RevenueChartProps {
  data: RevenueDay[]
  loading?: boolean
}

export function RevenueChart({ data, loading = false }: RevenueChartProps) {
  const [range, setRange] = useState<Range>('30d')

  const chartData = range === '7d' ? data.slice(-7) : data

  if (loading) {
    return (
      <div className='rounded-2xl border border-border/50 bg-background/50 p-6 backdrop-blur-xl shadow-sm'>
        <div className='mb-6 flex items-center justify-between'>
          <div className='space-y-2'>
            <div className='h-5 w-36 rounded-md bg-muted animate-pulse' />
            <div className='h-3.5 w-52 rounded-md bg-muted animate-pulse' />
          </div>
          <div className='h-8 w-32 rounded-lg bg-muted animate-pulse' />
        </div>
        <div className='h-[300px] w-full rounded-xl bg-muted/50 animate-pulse' />
      </div>
    )
  }

  const hasData = chartData.some((d) => d.total > 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
      className='rounded-2xl border border-border/50 bg-background/50 p-6 backdrop-blur-xl shadow-sm'
    >
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h2 className='text-lg font-semibold text-foreground'>Revenue Overview</h2>
          <p className='text-sm text-muted-foreground'>Total USDC received across all payment links</p>
        </div>
        <div className='flex gap-1 rounded-lg border border-border/50 bg-muted/30 p-1'>
          {(['7d', '30d'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                range === r ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className='h-[300px] w-full'>
        {!hasData ? (
          <div className='flex h-full items-center justify-center'>
            <p className='text-sm text-muted-foreground'>No transactions in this period</p>
          </div>
        ) : (
          <ResponsiveContainer width='100%' height='100%'>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id='revenueGradient' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='var(--color-primary)' stopOpacity={0.3} />
                  <stop offset='95%' stopColor='var(--color-primary)' stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='var(--color-border)' strokeOpacity={0.5} />
              <XAxis
                dataKey='date'
                tickFormatter={formatDate}
                stroke='var(--color-muted-foreground)'
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={8}
                interval={range === '7d' ? 0 : Math.floor(chartData.length / 6)}
              />
              <YAxis
                stroke='var(--color-muted-foreground)'
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className='rounded-xl border border-border/50 bg-background/95 p-3 shadow-xl backdrop-blur-md'>
                        <p className='mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                          {formatDate(label as string)}
                        </p>
                        <p className='text-lg font-bold text-foreground'>
                          $
                          {(payload[0].value as number).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
                cursor={{ stroke: 'var(--color-border)', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area
                type='monotone'
                dataKey='total'
                stroke='var(--color-primary)'
                strokeWidth={2.5}
                fillOpacity={1}
                fill='url(#revenueGradient)'
                activeDot={{ r: 5, fill: 'var(--color-primary)', stroke: 'var(--color-background)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  )
}
