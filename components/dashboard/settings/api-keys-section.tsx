'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { Key, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { ConfirmationModal } from '@/components/shared/confirmation-modal'
import type { ApiKey } from '@/lib/hooks/use-keys'

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Main section ─────────────────────────────────────────────────────────────

interface ApiKeysSectionProps {
  keys: ApiKey[]
  isLoading: boolean
  revokeKey: (id: string) => Promise<void>
}

export function ApiKeysSection({ keys, isLoading, revokeKey }: ApiKeysSectionProps) {
  const [revoking, setRevoking] = useState<string | null>(null)

  const handleRevoke = async (id: string) => {
    setRevoking(id)
    try {
      await revokeKey(id)
      toast.success('API key revoked')
    } catch {
      // Error toast is handled by the mutation
    } finally {
      setRevoking(null)
    }
  }

  return (
    <>
      <div className='mt-10'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'>
            API Keys {!isLoading && `(${keys.length})`}
          </h2>
        </div>

        <div className='space-y-2'>
          {isLoading ? (
            <div className='flex items-center justify-center py-10'>
              <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
            </div>
          ) : keys.length === 0 ? (
            <div className='flex flex-col items-center justify-center rounded-2xl border border-border/40 bg-card backdrop-blur-sm py-10 text-center shadow-[0_6px_16px_rgba(15,23,42,0.06)] dark:shadow-none'>
              <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 mb-3'>
                <Key className='h-5 w-5 text-muted-foreground/50' />
              </div>
              <p className='text-sm font-medium text-muted-foreground'>No API keys yet</p>
              <p className='mt-1 text-xs text-muted-foreground/60'>Create a key to start using the Settlix REST API.</p>
            </div>
          ) : (
            keys.map((key) => (
              <motion.div
                key={key.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className='group flex items-center gap-3 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm shadow-sm px-4 py-3 transition-all hover:bg-card/60 hover:border-border/60 hover:shadow-md'
              >
                <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/8'>
                  <Key className='h-3.5 w-3.5 text-primary/70' />
                </div>

                <div className='flex-1 min-w-0'>
                  <p className='text-[13px] font-semibold text-foreground truncate'>{key.name}</p>
                  <p className='text-[11px] text-muted-foreground font-mono'>sk_live_••••••••••••••••</p>
                </div>

                <div className='hidden sm:flex items-center gap-5 mx-2 opacity-70 group-hover:opacity-100 transition-opacity'>
                  <div className='flex flex-col items-end'>
                    <span className='text-[9px] font-semibold text-muted-foreground uppercase tracking-wider'>
                      Last used
                    </span>
                    <span className='text-[12px] font-medium text-foreground'>{timeAgo(key.lastUsedAt)}</span>
                  </div>
                  <div className='flex flex-col items-end'>
                    <span className='text-[9px] font-semibold text-muted-foreground uppercase tracking-wider'>
                      Created
                    </span>
                    <span className='text-[12px] font-medium text-foreground'>
                      {new Date(key.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <ConfirmationModal
                  className='text-red-500 h-6 w-6 rounded-lg p-0 hover:bg-background/80 hover:text-foreground transition-colors'
                  onConfirm={handleRevoke}
                  isPending={revoking === key.id}
                  id={key.id}
                  type='Revoke'
                />
              </motion.div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
