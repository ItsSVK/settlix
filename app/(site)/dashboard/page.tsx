'use client'

import { motion } from 'motion/react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useAuth } from '@/components/auth/auth-context'
import { DollarSign, Link as LinkIcon, FileText, ArrowUpRight, LucideIcon } from 'lucide-react'

const revenueData = [
  { name: 'Mon', total: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Tue', total: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Wed', total: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Thu', total: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Fri', total: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Sat', total: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Sun', total: Math.floor(Math.random() * 5000) + 1000 },
]

export default function DashboardOverviewPage() {
  const { wallet } = useAuth()

  return (
    <div className='flex-1 bg-muted/40 dark:bg-background/90 min-h-screen'>
      <div className='mx-auto max-w-6xl px-6 py-8'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className='mb-8'
        >
          <h1 className='text-3xl font-bold tracking-tight text-foreground'>Welcome back,</h1>
          <p className='text-muted-foreground mt-1'>
            {wallet ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : 'Merchant'} • Here&apos;s your business at a
            glance.
          </p>
        </motion.div>

        <div className='grid gap-6 md:grid-cols-3 mb-8'>
          <StatCard title='Total Revenue' value='$12,450.00' change='+14.5%' icon={DollarSign} delay={0.1} />
          <StatCard title='Active Links' value='24' change='+3' icon={LinkIcon} delay={0.2} />
          <StatCard title='Invoices Paid' value='142' change='+12%' icon={FileText} delay={0.3} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
          className='rounded-2xl border border-border/50 bg-background/50 p-6 backdrop-blur-xl shadow-sm'
        >
          <div className='mb-6 flex items-center justify-between'>
            <div>
              <h2 className='text-lg font-semibold text-foreground'>Revenue Overview</h2>
              <p className='text-sm text-muted-foreground'>Your revenue across all products over the last 7 days.</p>
            </div>
          </div>

          <div className='h-[350px] w-full'>
            <ResponsiveContainer width='100%' height='100%'>
              <AreaChart data={revenueData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id='colorTotal' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='var(--color-primary)' stopOpacity={0.3} />
                    <stop offset='95%' stopColor='var(--color-primary)' stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray='3 3'
                  vertical={false}
                  stroke='var(--color-border)'
                  strokeOpacity={0.5}
                />
                <XAxis
                  dataKey='name'
                  stroke='var(--color-muted-foreground)'
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke='var(--color-muted-foreground)'
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className='rounded-xl border border-border/50 bg-background/95 p-3 shadow-xl backdrop-blur-md'>
                          <p className='mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                            {label}
                          </p>
                          <p className='text-lg font-bold text-foreground'>${payload[0].value?.toLocaleString()}</p>
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
                  strokeWidth={3}
                  fillOpacity={1}
                  fill='url(#colorTotal)'
                  activeDot={{ r: 6, fill: 'var(--color-primary)', stroke: 'var(--color-background)', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  delay,
}: {
  title: string
  value: string
  change: string
  icon: LucideIcon
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className='relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 p-6 backdrop-blur-xl shadow-sm transition-all hover:shadow-md'
    >
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-sm font-medium text-muted-foreground'>{title}</p>
          <h3 className='mt-2 text-3xl font-bold tracking-tight text-foreground'>{value}</h3>
        </div>
        <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary'>
          <Icon className='h-6 w-6' />
        </div>
      </div>
      <div className='mt-4 flex items-center text-sm'>
        <span className='flex items-center font-medium text-green-500'>
          <ArrowUpRight className='mr-1 h-4 w-4' />
          {change}
        </span>
        <span className='ml-2 text-muted-foreground'>from last month</span>
      </div>
    </motion.div>
  )
}
