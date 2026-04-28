'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, Check, Copy, Key, Loader2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { copyText } from '@/lib/utils'
import type { ApiKey } from '@/lib/hooks/use-keys'

interface CreateKeyDialogProps {
  onCreated: () => void
}

function CreateKeyDialogPanel({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [revealData, setRevealData] = useState<{ raw: string; name: string } | null>(null)
  const [copied, setCopied] = useState(false)

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

      setRevealData({ raw: data.key, name: data.name })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDone = () => {
    onClose()
    setTimeout(() => onCreated(), 300)
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
          onClick={revealData ? undefined : onClose}
        />

        <motion.div
          key='create-panel'
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className='relative w-full max-w-md rounded-3xl border border-border/40 bg-card/60 p-6 shadow-2xl ring-1 ring-white/5 backdrop-blur-xl'
        >
          {revealData ? (
            <>
              <div className='mb-5 flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10'>
                    <Key className='h-4 w-4 text-green-500' />
                  </div>
                  <div>
                    <h2 className='text-lg font-semibold tracking-tight text-foreground'>API Key Created</h2>
                    <p className='text-xs text-muted-foreground'>{revealData.name}</p>
                  </div>
                </div>
                <Button
                  onClick={handleDone}
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

              <div className='mb-6 flex items-center gap-3 rounded-2xl border border-border/50 bg-background/50 p-3 ring-1 ring-border/20'>
                <span className='ml-2 flex-1 break-all font-mono text-sm text-muted-foreground'>
                  {revealData.raw}
                </span>
                <Button
                  onClick={() => copyText(revealData.raw, setCopied)}
                  title='Copy API Key'
                  variant='secondary'
                  size='sm'
                  className={`shrink-0 rounded-xl px-4 font-medium transition-all ${
                    copied ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : ''
                  }`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>

              <Button
                type='button'
                onClick={handleDone}
                className='relative flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-background transition-all hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:text-foreground'
              >
                Done, I&apos;ve saved it
              </Button>
            </>
          ) : (
            <>
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
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export function CreateKeyDialog({ onCreated }: CreateKeyDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className='flex items-center rounded-xl bg-primary px-3 py-2 sm:px-4 sm:py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] shadow-sm'
      >
        <Plus className='h-4 w-4' />
        <span className='hidden sm:inline-block'>Create Key</span>
      </Button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && <CreateKeyDialogPanel onClose={() => setOpen(false)} onCreated={onCreated} />}
          </AnimatePresence>,
          document.body
        )}
    </>
  )
}
