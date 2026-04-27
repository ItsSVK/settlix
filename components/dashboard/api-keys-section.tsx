'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, Check, Copy, Key, Loader2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { copyText } from '@/lib/utils'
import ArchiveItem from '@/components/shared/archive-item'

interface ApiKey {
  id: string
  name: string
  lastUsedAt: string | null
  createdAt: string
}

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

// ─── Key reveal modal ────────────────────────────────────────────────────────

interface RevealModalProps {
  rawKey: string
  name: string
  onClose: () => void
}

function RevealModalPanel({ rawKey, name, onClose }: RevealModalProps) {
  const [copied, setCopied] = useState(false)

  return (
    <div className='fixed inset-0 z-100 overflow-y-auto'>
      <div className='flex min-h-full items-center justify-center p-4'>
        <motion.div
          key='reveal-backdrop'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className='fixed inset-0 bg-background/80 backdrop-blur-md'
        />

        <motion.div
          key='reveal-panel'
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className='relative w-full max-w-lg rounded-3xl border border-border/40 bg-card/60 p-6 shadow-2xl ring-1 ring-white/5 backdrop-blur-xl'
        >
          <div className='mb-5 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10'>
                <Key className='h-4 w-4 text-green-500' />
              </div>
              <div>
                <h2 className='text-lg font-semibold tracking-tight text-foreground'>API Key Created</h2>
                <p className='text-xs text-muted-foreground'>{name}</p>
              </div>
            </div>
            <Button
              onClick={onClose}
              className='rounded-full p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              variant='ghost'
            >
              <X className='h-4 w-4' />
            </Button>
          </div>

          <div className='mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3'>
            <div className='flex items-start gap-2'>
              <AlertCircle className='mt-0.5 h-4 w-4 shrink-0 text-amber-500' />
              <p className='text-xs font-medium text-amber-600 dark:text-amber-400'>
                Copy this key now — it won&apos;t be shown again. Store it somewhere safe like a password manager or
                environment variable.
              </p>
            </div>
          </div>

          <div className='mb-5 flex items-center gap-2 rounded-xl border border-border/40 bg-muted/80 p-1.5'>
            <code className='flex-1 overflow-x-auto whitespace-nowrap px-3 font-mono text-sm text-foreground'>
              {rawKey}
            </code>
            <Button
              onClick={() => copyText(rawKey, setCopied)}
              variant={copied ? 'ghost' : 'secondary'}
              size='sm'
              className={`shrink-0 h-8 rounded-lg px-3 text-xs font-medium transition-all min-w-[75px] ${
                copied
                  ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20 dark:bg-green-500/15 dark:text-green-400'
                  : ''
              }`}
            >
              {copied ? (
                <>
                  <Check className='mr-1 h-3 w-3' /> Copied
                </>
              ) : (
                <>
                  <Copy className='mr-1 h-3 w-3' /> Copy
                </>
              )}
            </Button>
          </div>

          <Button onClick={onClose} className='w-full rounded-2xl py-3 text-sm font-semibold' variant='secondary'>
            Done, I&apos;ve saved it
          </Button>
        </motion.div>
      </div>
    </div>
  )
}

function RevealModal({ rawKey, name, open, onClose }: RevealModalProps & { open: boolean }) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      {open && <RevealModalPanel key='reveal' rawKey={rawKey} name={name} onClose={onClose} />}
    </AnimatePresence>,
    document.body,
  )
}

// ─── Create key dialog ────────────────────────────────────────────────────────

interface CreateKeyDialogProps {
  open: boolean
  onClose: () => void
  onCreated: (key: ApiKey & { key: string }) => void
}

function CreateKeyDialogPanel({ onClose, onCreated }: Omit<CreateKeyDialogProps, 'open'>) {
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) throw new Error(data.error ?? 'Failed to create key')

      onCreated(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='fixed inset-0 z-100 overflow-y-auto'>
      <div className='flex min-h-full items-center justify-center p-4'>
        <motion.div
          key='create-backdrop'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className='fixed inset-0 bg-background/80 backdrop-blur-md'
          onClick={onClose}
        />

        <motion.div
          key='create-panel'
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className='relative w-full max-w-md rounded-3xl border border-border/40 bg-card/60 p-6 shadow-2xl ring-1 ring-white/5 backdrop-blur-xl'
        >
          <div className='mb-5 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10'>
                <Key className='h-4 w-4 text-primary' />
              </div>
              <div>
                <h2 className='text-lg font-semibold tracking-tight text-foreground'>New API Key</h2>
                <p className='text-xs text-muted-foreground'>Give it a name to identify it later</p>
              </div>
            </div>
            <Button
              onClick={onClose}
              className='rounded-full p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              variant='ghost'
            >
              <X className='h-4 w-4' />
            </Button>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className='space-y-4'>
            <div className='space-y-1.5 rounded-2xl border border-border/40 bg-background/30 p-4'>
              <label htmlFor='key-name' className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                Key Name
              </label>
              <div className='rounded-xl bg-muted/90 p-1.5 focus-within:ring-1 focus-within:ring-primary/30 transition-all'>
                <input
                  id='key-name'
                  type='text'
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setError('')
                  }}
                  placeholder='e.g. Production Server, My App'
                  maxLength={64}
                  autoFocus
                  className='w-full bg-transparent px-3 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground'
                />
              </div>
              <p className='text-[11px] text-muted-foreground'>
                This is just a label — it doesn&apos;t affect what the key can access.
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className='flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive'
              >
                <AlertCircle className='mt-0.5 h-4 w-4 shrink-0' />
                <p className='font-medium'>{error}</p>
              </motion.div>
            )}

            <Button
              type='submit'
              disabled={!name.trim() || isLoading}
              className='w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-background transition-all hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:text-foreground'
            >
              {isLoading ? (
                <span className='flex items-center gap-2'>
                  <Loader2 className='h-4 w-4 animate-spin' /> Creating...
                </span>
              ) : (
                'Create Key'
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}

function CreateKeyDialog({ open, onClose, onCreated }: CreateKeyDialogProps) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      {open && <CreateKeyDialogPanel key='create' onClose={onClose} onCreated={onCreated} />}
    </AnimatePresence>,
    document.body,
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────

export function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [revealKey, setRevealKey] = useState<{ raw: string; name: string } | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null)

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/keys', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setKeys(data.keys)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchKeys()
  }, [fetchKeys])

  const handleCreated = (data: ApiKey & { key: string }) => {
    setCreateOpen(false)
    setKeys((prev) => [
      { id: data.id, name: data.name, lastUsedAt: data.lastUsedAt, createdAt: data.createdAt },
      ...prev,
    ])
    setRevealKey({ raw: data.key, name: data.name })
  }

  const handleRevoke = async (id: string) => {
    setRevoking(id)
    try {
      const res = await fetch(`/api/keys/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Failed to revoke key')
        return
      }
      setKeys((prev) => prev.filter((k) => k.id !== id))
      toast.success('API key revoked')
    } catch {
      toast.error('Failed to revoke key')
    } finally {
      setRevoking(null)
      setConfirmRevoke(null)
    }
  }

  return (
    <>
      <div className='mt-10'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'>
            API Keys {!isLoading && `(${keys.length})`}
          </h2>
          <Button
            onClick={() => setCreateOpen(true)}
            size='sm'
            className='flex items-center gap-1.5 rounded-xl text-xs font-semibold'
          >
            <Plus className='h-3.5 w-3.5' />
            New Key
          </Button>
        </div>

        <div className='space-y-2'>
          {isLoading ? (
            <div className='flex items-center justify-center py-10'>
              <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
            </div>
          ) : keys.length === 0 ? (
            <div className='flex flex-col items-center justify-center rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm py-10 text-center'>
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

                <ArchiveItem
                  handleArchive={handleRevoke}
                  confirmArchive={confirmRevoke}
                  setConfirmArchive={setConfirmRevoke}
                  archiving={revoking}
                  item={key}
                  type='Revoke'
                />
              </motion.div>
            ))
          )}
        </div>
      </div>

      <CreateKeyDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />

      {revealKey && (
        <RevealModal
          open={!!revealKey}
          rawKey={revealKey.raw}
          name={revealKey.name}
          onClose={() => setRevealKey(null)}
        />
      )}
    </>
  )
}
