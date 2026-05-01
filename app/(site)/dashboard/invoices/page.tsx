'use client'

import { motion } from 'motion/react'
import { InvoicesTable } from '@/components/dashboard/invoices/invoices-table'
import { CreateInvoiceDialog } from '@/components/dashboard/invoices/create-invoice-dialog'
import { useInvoices } from '@/lib/hooks/use-invoices'
import { SkeletonGrid } from '@/components/shared/skeletons'
import { StatsBar } from '@/components/dashboard/stats-bar'

export default function InvoicesPage() {
  const { invoices, isLoading, refresh, archiveInvoice, sendInvoice } = useInvoices()

  const invoiceStats = [
    { label: 'Total invoices', value: invoices.length },
    { label: 'Total successful payments', value: invoices.reduce((s, i) => s + (i.status === 'paid' ? 1 : 0), 0) },
    { label: 'Total overdue invoices', value: invoices.reduce((s, i) => s + (i.status === 'overdue' ? 1 : 0), 0) },
    {
      label: 'Revenue (USDC)',
      value: invoices.reduce((s, i) => s + parseFloat(i.amount), 0),
      format: 'usdc' as const,
    },
  ]

  return (
    <div className='flex-1 bg-muted/40 dark:bg-background'>
      <div className='mx-auto max-w-6xl px-6 py-6'>
        {/* Header */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className='mb-8 flex items-center justify-between'
        >
          <h1 className='text-2xl font-bold text-foreground'>Invoices</h1>
          <CreateInvoiceDialog onCreated={refresh} />
        </motion.div>

        {/* Stats */}
        {isLoading ? (
          <SkeletonGrid />
        ) : (
          invoices.length > 0 && (
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className='mb-8'
            >
              <StatsBar stats={invoiceStats} />
            </motion.div>
          )
        )}

        {/* Invoices List */}
        <motion.div initial={false} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'>
              Invoices {!isLoading && `(${invoices.length})`}
            </h2>
          </div>
          <InvoicesTable
            invoices={invoices}
            isLoading={isLoading}
            onRefresh={refresh}
            archiveInvoice={archiveInvoice}
            sendInvoice={sendInvoice}
          />
        </motion.div>
      </div>
    </div>
  )
}
