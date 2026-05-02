'use client'

import { motion } from 'motion/react'
import { type LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  sub: string
  icon: LucideIcon
  delay?: number
  loading?: boolean
}

export function StatCard({ title, value, sub, icon: Icon, delay = 0, loading = false }: StatCardProps) {
  if (loading) {
    return (
      <div className='rounded-2xl border border-border/50 bg-background/50 p-6 backdrop-blur-xl shadow-sm'>
        <div className='flex items-center justify-between'>
          <div className='space-y-2 flex-1'>
            <div className='h-3.5 w-24 rounded-md bg-muted animate-pulse' />
            <div className='h-8 w-32 rounded-md bg-muted animate-pulse' />
          </div>
          <div className='h-12 w-12 rounded-xl bg-muted animate-pulse' />
        </div>
        <div className='mt-4 h-3.5 w-40 rounded-md bg-muted animate-pulse' />
      </div>
    )
  }

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
      <p className='mt-4 text-sm text-muted-foreground'>{sub}</p>
    </motion.div>
  )
}
