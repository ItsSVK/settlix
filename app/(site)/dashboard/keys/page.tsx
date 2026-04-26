'use client'

import { motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ApiKeysSection } from '@/components/dashboard/api-keys-section'

export default function ApiKeysPage() {
  return (
    <main className='flex-1 bg-muted/60 dark:bg-background'>
      <div className='mx-auto w-[80%] max-w-6xl px-4 pt-28 pb-10'>
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className='mb-8'
        >
          <Link
            href='/dashboard'
            className='mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors'
          >
            <ArrowLeft className='h-3.5 w-3.5' />
            Back to Dashboard
          </Link>
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
