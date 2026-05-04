'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { StatsBar } from '@/components/dashboard/stats-bar'
import { LinksTable } from '@/components/dashboard/links/links-table'
import { CreateLinkDialog } from '@/components/dashboard/links/create-link-dialog'
import { SkeletonGrid } from '@/components/shared/skeletons'
import { Switch } from '@/components/ui/switch'
import { useLinks } from '@/lib/hooks/use-links'

export default function LinksPage() {
  const { links, isLoading } = useLinks()
  const [activeOnly, setActiveOnly] = useState(false)

  const filteredLinks = activeOnly ? links.filter((link) => link.active) : links

  const linkStats = [
    { label: 'Total links', value: links.length },
    { label: 'Total successful payments', value: links.reduce((s, l) => s + l.stats.paidCount, 0) },
    { label: 'Total failed payments', value: links.reduce((s, l) => s + l.stats.failedCount, 0) },
    {
      label: 'Revenue (USDC)',
      value: links.reduce((s, l) => s + parseFloat(l.stats.totalVolume), 0) / 1_000_000,
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
          className='mb-8 flex items-center justify-between flex-col gap-4 sm:flex-row'
        >
          <div>
            <h1 className='text-2xl font-bold text-foreground'>Payment Links</h1>
            <p className='mt-1 text-sm text-muted-foreground'>Manage payments with links that settle in your wallet.</p>
          </div>
          <CreateLinkDialog />
        </motion.div>

        {/* Stats */}
        {isLoading ? (
          <SkeletonGrid />
        ) : (
          links.length > 0 && (
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className='mb-8'
            >
              <StatsBar stats={linkStats} />
            </motion.div>
          )
        )}

        {/* Links */}
        <motion.div initial={false} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.2 }}>
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
          <LinksTable links={filteredLinks} isLoading={isLoading} />
        </motion.div>
      </div>
    </div>
  )
}
