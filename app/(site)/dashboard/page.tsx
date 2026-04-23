'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { WalletAvatar } from '@/components/shared/wallet-avatar'
import { StatsBar } from '@/components/dashboard/stats-bar'
import { LinksTable } from '@/components/dashboard/links-table'
import { CreateLinkDialog } from '@/components/dashboard/create-link-dialog'
import { DistributeButton } from '@/components/dashboard/distribute-button'
import { useDashboard } from '@/lib/hooks/use-dashboard'
import { useAuth } from '@/components/auth/auth-context'
import { Switch } from '@/components/ui/switch'

export default function DashboardPage() {
  const { wallet } = useAuth()
  const { data, isLoading, refresh, toggleLinkActive } = useDashboard()
  const [activeOnly, setActiveOnly] = useState(false)

  const links = data?.links ?? []
  const filteredLinks = activeOnly ? links.filter((link) => link.active) : links

  return (
    <main className='flex-1 bg-muted/60 dark:bg-background'>
      <div className='mx-auto w-[80%] max-w-6xl px-4 pt-28 pb-10'>
        {/* Header */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className='mb-8 flex gap-3 flex-row items-center justify-between'
        >
          <div className='sm:flex items-center gap-2'>
            <h1 className='text-2xl font-bold text-foreground'>Dashboard</h1>
            {wallet && <WalletAvatar address={wallet} className='mt-1' />}
          </div>
          <CreateLinkDialog onCreated={refresh} />
        </motion.div>

        {/* Stats */}
        {!isLoading && links.length > 0 && (
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className='mb-8'
          >
            <StatsBar links={links} />
          </motion.div>
        )}

        {/* Links */}
        <motion.div initial={false} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <DistributeButton onDistributed={refresh} />
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'>
              Payment Links {!isLoading && `(${filteredLinks.length})`}
            </h2>

            {links.length > 0 && (
              <div className='flex items-center gap-2'>
                <span className='text-xs font-medium text-muted-foreground'>Active only</span>
                <Switch checked={activeOnly} onCheckedChange={setActiveOnly} size='sm' />
              </div>
            )}
          </div>
          <LinksTable links={filteredLinks} isLoading={isLoading} onRefresh={refresh} onToggle={toggleLinkActive} />
        </motion.div>
      </div>
    </main>
  )
}
