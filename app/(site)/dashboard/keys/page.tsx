'use client'

import { motion } from 'motion/react'
import { ApiKeysSection } from '@/components/dashboard/api-keys-section'

export default function ApiKeysPage() {
  return (
    <div className='flex-1 bg-muted/40 dark:bg-background'>
      <div className='mx-auto max-w-6xl px-6 py-6'>
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
    </div>
  )
}
