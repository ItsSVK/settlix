'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { ApiKeysSection } from '@/components/dashboard/api-keys-section'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'

export default function ApiKeysPage() {
  return (
    <main className='flex-1 bg-muted/60 dark:bg-background'>
      <div className='mx-auto w-[80%] max-w-6xl px-4 pt-28 pb-10'>
        <Breadcrumb className='mb-6'>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href='/dashboard'>Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>API Keys</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className='mb-8'
        >
          <h1 className='text-2xl font-bold text-foreground'>API Keys</h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            Manage keys for authenticating requests to the Settlix REST API.
          </p>
        </motion.div>

        <motion.div initial={false} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <ApiKeysSection />
        </motion.div>
      </div>
    </main>
  )
}
