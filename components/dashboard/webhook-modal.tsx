'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, Check, Loader2, Webhook, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { copyText } from '@/lib/utils'

interface WebhookModalProps {
  open: boolean
  onClose: () => void
  onUpdated: () => void
  webhookUrl: string | null
  hasWebhookSecret: boolean
}

function generateWebhookSecret() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function WebhookModalPanel({
  onClose,
  onUpdated,
  webhookUrl: initialWebhookUrl,
  hasWebhookSecret,
}: Omit<WebhookModalProps, 'open'>) {
  const [webhookUrl, setWebhookUrl] = useState(initialWebhookUrl ?? '')
  const [webhookUrlTested, setWebhookUrlTested] = useState(Boolean(initialWebhookUrl))
  const [webhookSecret, setWebhookSecret] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTestingWebhook, setIsTestingWebhook] = useState(false)

  const saveWebhook = async ({ clear = false }: { clear?: boolean } = {}) => {
    const trimmedUrl = clear ? '' : webhookUrl.trim()
    const trimmedSecret = clear ? '' : webhookSecret.trim()

    if (trimmedSecret && !trimmedUrl) {
      setError('Webhook URL is required when you add a signing secret.')
      return
    }

    if (trimmedUrl) {
      try {
        const parsed = new URL(trimmedUrl)
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error()
      } catch {
        setError('Webhook URL must be a valid http or https URL.')
        return
      }
    }

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/dashboard/webhook', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: trimmedUrl || undefined,
          webhookSecret: trimmedSecret || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to save webhook')
      }

      toast.success(trimmedUrl ? 'Webhook saved' : 'Webhook cleared')
      onUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const testWebhook = async () => {
    setIsTestingWebhook(true)
    setError('')
    try {
      const res = await fetch('/api/dashboard/webhook/test', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: webhookUrl.trim(),
          webhookSecret: webhookSecret.trim() || undefined,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to send test event')
      if (!data.ok) throw new Error(data.error ?? 'Endpoint rejected the test event')

      setWebhookUrlTested(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test webhook')
      setWebhookUrlTested(false)
    } finally {
      setIsTestingWebhook(false)
    }
  }

  return (
    <div className='fixed inset-0 z-100 overflow-y-auto'>
      <div className='flex min-h-full items-center justify-center p-4'>
        <motion.div
          key='webhook-backdrop'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className='fixed inset-0 bg-background/80 backdrop-blur-md transition-opacity'
          onClick={onClose}
        />

        <motion.div
          key='webhook-panel'
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className='relative w-full max-w-lg rounded-3xl border border-border/40 bg-card/60 p-6 shadow-2xl outline-none ring-1 ring-white/5 backdrop-blur-xl'
        >
          <div className='mb-6 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10'>
                <Webhook className='h-4 w-4 text-primary' />
              </div>
              <div>
                <h2 className='text-lg font-semibold tracking-tight text-foreground'>Webhook</h2>
                <p className='text-xs text-muted-foreground'>Receive callbacks after every successful payment</p>
              </div>
            </div>
            <Button
              onClick={onClose}
              className='rounded-full p-2 text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground'
              variant='ghost'
              aria-label='Close webhook modal'
            >
              <X className='h-4 w-4' />
            </Button>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); void saveWebhook() }}
            className='space-y-4'
            noValidate
          >
            <div className='space-y-4 rounded-2xl border border-border/40 bg-background/30 p-4'>
              <div className='space-y-1.5'>
                <label htmlFor='webhook-url-modal' className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                  Webhook URL
                </label>
                <div className='flex items-center gap-2 rounded-xl bg-muted/90 p-1.5 focus-within:ring-1 focus-within:ring-primary/30 transition-all'>
                  <input
                    id='webhook-url-modal'
                    type='url'
                    inputMode='url'
                    autoComplete='url'
                    value={webhookUrl}
                    onChange={(e) => {
                      setWebhookUrl(e.target.value)
                      setWebhookUrlTested(e.target.value === (initialWebhookUrl ?? ''))
                      setError('')
                    }}
                    placeholder='https://yourdomain.com/settlix/webhook'
                    className='flex-1 bg-transparent px-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground min-w-0'
                  />
                  <Button
                    type='button'
                    variant={webhookUrlTested ? 'ghost' : 'secondary'}
                    size='sm'
                    onClick={() => void testWebhook()}
                    className={`shrink-0 h-8 rounded-lg px-3 text-xs font-medium transition-all min-w-[75px] ${
                      webhookUrlTested ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20 disabled:opacity-100' : ''
                    }`}
                    disabled={!webhookUrl || webhookUrlTested || isTestingWebhook}
                  >
                    {isTestingWebhook ? (
                      <Loader2 className='h-3 w-3 animate-spin' />
                    ) : webhookUrlTested ? (
                      <><Check className='mr-1 h-3 w-3' /> Verified</>
                    ) : (
                      'Test'
                    )}
                  </Button>
                </div>
                <p className='text-[11px] leading-relaxed text-muted-foreground'>
                  We&apos;ll POST JSON to this URL after every successful payment across all your links.
                </p>
              </div>

              <div className='space-y-1.5'>
                <label htmlFor='webhook-secret' className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                  Signing Secret
                </label>
                <div className='flex items-center gap-2 rounded-xl bg-muted/90 p-1.5 focus-within:ring-1 focus-within:ring-primary/30 transition-all'>
                  <input
                    id='webhook-secret'
                    type='text'
                    autoComplete='new-password'
                    spellCheck='false'
                    value={webhookSecret}
                    onChange={(e) => { setWebhookSecret(e.target.value); setError('') }}
                    placeholder='Signing Secret (Optional HMAC)'
                    className='flex-1 bg-transparent px-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground min-w-0'
                  />
                  {!webhookSecret ? (
                    <Button
                      type='button'
                      variant='secondary'
                      size='sm'
                      onClick={() => { setWebhookSecret(generateWebhookSecret()); setError('') }}
                      className='shrink-0 h-8 rounded-lg px-3 text-xs font-medium'
                    >
                      Generate
                    </Button>
                  ) : (
                    <Button
                      type='button'
                      onClick={() => copyText(webhookSecret, setCopied)}
                      title='Copy webhook secret'
                      variant={copied ? 'ghost' : 'secondary'}
                      size='sm'
                      className={`shrink-0 h-8 rounded-lg px-3 text-xs font-medium min-w-[75px] ${
                        copied ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : ''
                      }`}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  )}
                </div>
                <p className='text-[11px] leading-relaxed text-muted-foreground'>
                  {hasWebhookSecret
                    ? 'A signing secret is already stored. Leave blank to keep it, or generate a new one to replace it.'
                    : 'If set, we include X-Settlix-Signature: sha256=… so your server can verify the payload.'}
                </p>
              </div>
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

            <div className='flex flex-col gap-2 pt-2'>
              <Button
                type='submit'
                disabled={!webhookUrlTested || isLoading}
                className='w-full rounded-2xl bg-primary py-3.5 text-sm font-semibold text-background hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:text-foreground'
              >
                {isLoading ? <><Loader2 className='h-5 w-5 animate-spin' /> Saving...</> : 'Save Webhook'}
              </Button>

              {initialWebhookUrl && (
                <Button
                  type='button'
                  variant='ghost'
                  onClick={() => void saveWebhook({ clear: true })}
                  disabled={isLoading}
                  className='w-full rounded-2xl text-sm font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive'
                >
                  Clear Webhook
                </Button>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}

export function WebhookModal({ open, onClose, onUpdated, webhookUrl, hasWebhookSecret }: WebhookModalProps) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <WebhookModalPanel
          key={`${webhookUrl ?? ''}:${hasWebhookSecret ? '1' : '0'}`}
          onClose={onClose}
          onUpdated={onUpdated}
          webhookUrl={webhookUrl}
          hasWebhookSecret={hasWebhookSecret}
        />
      )}
    </AnimatePresence>,
    document.body,
  )
}
