'use client'

import { motion } from 'motion/react'
import { WalletAvatar } from '@/components/shared/wallet-avatar'
import { StatsBar } from '@/components/dashboard/stats-bar'
import { LinksTable } from '@/components/dashboard/links-table'
import { CreateLinkDialog } from '@/components/dashboard/create-link-dialog'
import { useDashboard } from '@/lib/hooks/use-dashboard'
import { useAuth } from '@/components/auth/auth-context'

export default function DashboardPage() {
  const { wallet } = useAuth()
  const { data, isLoading, refresh } = useDashboard()

  const links = data?.links ?? []

  return (
    <main className='mx-auto w-[80%] max-w-6xl flex-1 px-4 pt-28'>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className='mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'
      >
        <div>
          <h1 className='text-2xl font-bold text-foreground'>Dashboard</h1>
          {wallet && <WalletAvatar address={wallet} className='mt-1' />}
        </div>
        <CreateLinkDialog onCreated={refresh} />
      </motion.div>

      {/* Stats */}
      {!isLoading && links.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className='mb-8'
        >
          <StatsBar links={links} />
        </motion.div>
      )}

      {/* Links */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.2 }}>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'>
            Payment Links {!isLoading && `(${links.length})`}
          </h2>
        </div>
        <LinksTable links={links} isLoading={isLoading} onRefresh={refresh} />
      </motion.div>
    </main>
  )
}
