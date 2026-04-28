'use client'

import { useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'motion/react'
import type { Invoice } from '@/lib/hooks/use-invoices'

interface StatsBarInvoiceProps {
  invoices: Invoice[]
}

function CountCard({ label, value }: { label: string; value: number }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString())

  useEffect(() => {
    const c = animate(count, value, { duration: 1, ease: 'easeOut' })
    return c.stop
  }, [value, count])

  return (
    <div className='rounded-2xl border border-border/40 bg-card p-5 shadow-[0_6px_16px_rgba(15,23,42,0.06)] dark:shadow-none transition-all hover:scale-[1.02] hover:shadow-[0_10px_24px_rgba(15,23,42,0.1)] dark:hover:shadow-none'>
      <p className='text-xs font-medium text-muted-foreground'>{label}</p>
      <motion.p className='mt-1 text-3xl font-bold tracking-tight text-foreground'>{rounded}</motion.p>
    </div>
  )
}

export function StatsBarInvoice({ invoices }: StatsBarInvoiceProps) {
  const totalInvoices = invoices.length
  const totalPaid = invoices.reduce((s, i) => s + (i.status === 'paid' ? 1 : 0), 0)
  const totalOverdue = invoices.reduce((s, i) => s + (i.status === 'overdue' ? 1 : 0), 0)
  const totalRevenue = invoices.reduce((s, i) => s + parseFloat(i.amount), 0) / 1_000_000

  return (
    <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
      <CountCard label='Total invoices' value={totalInvoices} />
      <CountCard label='Total successful payments' value={totalPaid} />
      <CountCard label='Total overdue invoices' value={totalOverdue} />
      <div className='col-span-1 sm:col-span-1 rounded-2xl border border-border/40 bg-card p-5 shadow-[0_6px_16px_rgba(15,23,42,0.06)] dark:shadow-none transition-all hover:scale-[1.02] hover:shadow-[0_10px_24px_rgba(15,23,42,0.1)] dark:hover:shadow-none'>
        <p className='text-xs font-medium text-muted-foreground'>Revenue (USDC)</p>
        <p className='mt-1 text-3xl font-bold tracking-tight text-foreground'>
          {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  )
}
