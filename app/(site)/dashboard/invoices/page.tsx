'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { WalletAvatar } from '@/components/shared/wallet-avatar'
import { InvoicesTable } from '@/components/dashboard/invoice-section'
import { CreateInvoiceDialog } from '@/components/dashboard/create-invoice-dialog'
import { useInvoices } from '@/lib/hooks/use-invoices'
import { useAuth } from '@/components/auth/auth-context'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'

export default function InvoicesPage() {
  const { wallet } = useAuth()
  const { invoices, isLoading, refresh } = useInvoices()

  return (
    <main className='flex-1 bg-muted/60 dark:bg-background'>
      <div className='mx-auto w-[80%] max-w-6xl px-4 pt-28 pb-10'>
        {/* Breadcrumb */}
        <Breadcrumb className='mb-6'>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href='/dashboard'>Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Invoices</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className='mb-8 flex gap-3 flex-row items-center justify-between'
        >
          <div className='sm:flex items-center gap-2'>
            <h1 className='text-2xl font-bold text-foreground'>Invoices</h1>
            {wallet && <WalletAvatar address={wallet} className='mt-1' />}
          </div>
          <CreateInvoiceDialog onCreated={refresh} />
        </motion.div>

        {/* Invoices List */}
        <motion.div initial={false} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'>
              Invoices {!isLoading && `(${invoices.length})`}
            </h2>
          </div>
          <InvoicesTable invoices={invoices} isLoading={isLoading} onRefresh={refresh} />
        </motion.div>
      </div>
    </main>
  )
}
