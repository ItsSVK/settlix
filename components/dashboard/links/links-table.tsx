'use client'

import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Link } from '@/lib/hooks/use-links'
import { LinkRow } from './link-row'
import { CreateLinkDialog } from './create-link-dialog'
import { Button } from '@/components/ui/button'
import { SkeletonRow } from '@/components/shared/skeletons'
import { EmptyState } from '@/components/shared/empty-state'

interface LinksTableProps {
  links: Link[]
  isLoading: boolean
  onRefresh: () => void
  onToggle: (id: string, active: boolean) => Promise<void>
  onArchive: (id: string) => Promise<void>
}

export function LinksTable({ links, isLoading, onRefresh, onToggle, onArchive }: LinksTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const totalPages = Math.ceil(links.length / itemsPerPage)
  const safePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages))

  const currentLinks = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage
    return links.slice(start, start + itemsPerPage)
  }, [links, safePage, itemsPerPage])

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
      <EmptyState
        title='No payment links yet'
        description='Create your first link and start accepting payments.'
        action={<CreateLinkDialog onCreated={onRefresh} />}
      />
    )
  }

  return (
    <div className='space-y-3'>
      {currentLinks.map((link, i) => (
        <motion.div
          key={link.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
        >
          <LinkRow link={link} onToggle={onToggle} onRefresh={onRefresh} onArchive={onArchive} />
        </motion.div>
      ))}

      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className='flex items-center justify-between px-2 pt-4'
        >
          <div className='text-xs text-muted-foreground'>
            {/* Desktop: full text */}
            <span className='hidden sm:inline'>
              Showing <span className='font-medium text-foreground'>{(safePage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className='font-medium text-foreground'>{Math.min(safePage * itemsPerPage, links.length)}</span> of{' '}
              <span className='font-medium text-foreground'>{links.length}</span> results
            </span>
            {/* Mobile: concise text */}
            <span className='sm:hidden'>
              <span className='font-medium text-foreground'>
                {(safePage - 1) * itemsPerPage + 1} - {Math.min(safePage * itemsPerPage, links.length)}
              </span>{' '}
              of <span className='font-medium text-foreground'>{links.length}</span>
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
              disabled={safePage === 1}
              className='h-8 rounded-xl border-border/40 shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:shadow-none transition-all hover:border-border/70 hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:hover:shadow-none bg-card text-muted-foreground hover:text-foreground'
            >
              <ChevronLeft className='mr-1 h-3.5 w-3.5' />
              Previous
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
              disabled={safePage === totalPages}
              className='h-8 rounded-xl border-border/40 shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:shadow-none transition-all hover:border-border/70 hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:hover:shadow-none bg-card text-muted-foreground hover:text-foreground'
            >
              Next
              <ChevronRight className='ml-1 h-3.5 w-3.5' />
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
