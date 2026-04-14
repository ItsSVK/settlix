'use client'

import { motion } from 'motion/react'
import type { DashboardLink } from '@/lib/hooks/use-dashboard'
import { LinkRow } from './link-row'
import { CreateLinkDialog } from './create-link-dialog'
import { BackgroundBeams } from '@/components/ui/background-beams'

interface LinksTableProps {
  links: DashboardLink[]
  isLoading: boolean
  onRefresh: () => void
  onToggle: (id: string, active: boolean) => Promise<void>
}

function SkeletonRow() {
  return (
    <div className='flex items-center gap-3 rounded-xl border border-border/30 p-4'>
      <div className='h-2 w-2 animate-pulse rounded-full bg-muted' />
      <div className='h-4 flex-1 animate-pulse rounded bg-muted' />
      <div className='h-4 w-16 animate-pulse rounded bg-muted' />
    </div>
  )
}

export function LinksTable({ links, isLoading, onRefresh, onToggle }: LinksTableProps) {

  if (isLoading) {
    return (
      <div className='space-y-3'>
        {[1, 2, 3].map((i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    )
  }

  if (links.length === 0) {
    return (
      <div className='relative flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 py-20 text-center overflow-hidden'>
        <BackgroundBeams className='opacity-20' />
        <div className='relative z-10'>
          <p className='text-lg font-semibold text-foreground'>No payment links yet</p>
          <p className='mt-2 text-sm text-muted-foreground'>Create your first link and start accepting payments.</p>
          <div className='mt-5 flex justify-center'>
            <CreateLinkDialog onCreated={onRefresh} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-3'>
      {links.map((link, i) => (
        <motion.div
          key={link.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
        >
          <LinkRow link={link} onToggle={onToggle} />
        </motion.div>
      ))}
    </div>
  )
}
