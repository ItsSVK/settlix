'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'
import { SkeletonRow } from '@/components/shared/skeletons'
import { SubscriptionRow } from './subscription-row'
import type { Subscription } from '@/lib/hooks/use-subscriptions'

interface SubscriptionsTableProps {
  subscriptions: Subscription[]
  isLoading: boolean
  onRefresh: () => void
  cancelSubscription: (id: string) => Promise<void>
}

export function SubscriptionsTable({ subscriptions, isLoading, onRefresh, cancelSubscription }: SubscriptionsTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const totalPages = Math.ceil(subscriptions.length / itemsPerPage)
  const safePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages))

  const currentItems = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage
    return subscriptions.slice(start, start + itemsPerPage)
  }, [subscriptions, safePage])

  if (isLoading) {
    return (
      <div className='space-y-3'>
        {[1, 2, 3].map((i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    )
  }

  if (subscriptions.length === 0) {
    return (
      <EmptyState
        title='No subscriptions yet'
        description='Subscribers will appear here once someone subscribes to one of your recurring payment links.'
      />
    )
  }

  return (
    <div className='space-y-3'>
      <AnimatePresence initial={false}>
        {currentItems.map((sub, i) => (
          <motion.div
            key={sub.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <SubscriptionRow
              subscription={sub}
              onCancel={cancelSubscription}
              onRefresh={onRefresh}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className='flex items-center justify-between px-2 pt-4'
        >
          <div className='text-xs text-muted-foreground'>
            <span className='hidden sm:inline'>
              Showing <span className='font-medium text-foreground'>{(safePage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className='font-medium text-foreground'>
                {Math.min(safePage * itemsPerPage, subscriptions.length)}
              </span>{' '}
              of <span className='font-medium text-foreground'>{subscriptions.length}</span> results
            </span>
            <span className='sm:hidden'>
              <span className='font-medium text-foreground'>
                {(safePage - 1) * itemsPerPage + 1} –{' '}
                {Math.min(safePage * itemsPerPage, subscriptions.length)}
              </span>{' '}
              of <span className='font-medium text-foreground'>{subscriptions.length}</span>
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
