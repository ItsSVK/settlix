'use client'

import { motion } from 'motion/react'
import { InvoicesTable } from '@/components/dashboard/invoice-section'
import { CreateInvoiceDialog } from '@/components/dashboard/create-invoice-dialog'
import { useInvoices } from '@/lib/hooks/use-invoices'
import { SkeletonCard } from '@/components/shared/skeletons'
import { StatsBarInvoice } from '@/components/dashboard/stats-bar-invoice'

export default function InvoicesPage() {
  const { invoices, isLoading, refresh, archiveInvoice, sendInvoice } = useInvoices()

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
          <div className='mb-8 grid grid-cols-1 gap-4 md:grid-cols-4'>
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          invoices.length > 0 && (
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className='mb-8'
            >
              <StatsBarInvoice invoices={invoices} />
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
