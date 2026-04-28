'use client'

import { useState, useEffect } from 'react'
import { Webhook, CheckCircle2, Circle, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WebhookModal } from '@/components/dashboard/webhook-modal'

interface WebhookConfig {
  webhookUrl: string | null
  hasWebhookSecret: boolean
}

export default function WebhookPage() {
  const [config, setConfig] = useState<WebhookConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const load = async () => {
    try {
      const res = await fetch('/api/dashboard/webhook', { credentials: 'include' })
      if (!res.ok) return
      setConfig(await res.json())
    } catch {
      // silently fail
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <div className='flex-1 bg-muted/40 dark:bg-background'>
      <div className='mx-auto max-w-3xl px-6 py-6'>
        <div className='mb-8 flex items-center gap-3'>
          <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10'>
            <Webhook className='h-4 w-4 text-primary' />
          </div>
          <div>
            <h1 className='text-2xl font-bold text-foreground'>Webhook</h1>
            <p className='text-sm text-muted-foreground'>
              One endpoint receives callbacks for every payment across all your links.
            </p>
          </div>
        </div>

        <div className='rounded-3xl border border-border/40 bg-card backdrop-blur-sm divide-y divide-border/30 shadow-[0_6px_16px_rgba(15,23,42,0.06)] dark:shadow-none'>
          <div className='flex items-center justify-between px-6 py-5'>
            <div className='space-y-1'>
              <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Endpoint</p>
              {isLoading ? (
                <div className='h-4 w-48 animate-pulse rounded bg-muted' />
              ) : config?.webhookUrl ? (
                <p className='text-sm text-foreground break-all'>{config.webhookUrl}</p>
              ) : (
                <p className='text-sm text-muted-foreground italic'>Not configured</p>
              )}
            </div>
            {config?.webhookUrl ? (
              <span className='flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-bold text-green-500 ring-1 ring-green-500/20'>
                <CheckCircle2 className='h-3 w-3' /> Active
              </span>
            ) : (
              <span className='flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground ring-1 ring-border/40'>
                <Circle className='h-3 w-3' /> Not set
              </span>
            )}
          </div>

          <div className='flex items-center justify-between px-6 py-5'>
            <div className='space-y-1'>
              <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Signing Secret</p>
              {isLoading ? (
                <div className='h-4 w-32 animate-pulse rounded bg-muted' />
              ) : (
                <p className='text-sm text-foreground'>
                  {config?.hasWebhookSecret ? (
                    '••••••••••••••••'
                  ) : (
                    <span className='italic text-muted-foreground'>Not configured</span>
                  )}
                </p>
              )}
            </div>
            {config?.hasWebhookSecret ? (
              <span className='flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-bold text-green-500 ring-1 ring-green-500/20'>
                <CheckCircle2 className='h-3 w-3' /> Enabled
              </span>
            ) : (
              <span className='flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground ring-1 ring-border/40'>
                <Circle className='h-3 w-3' /> Not set
              </span>
            )}
          </div>

          <div className='px-6 py-4 flex justify-end'>
            <Button
              onClick={() => setOpen(true)}
              className='flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold'
            >
              <Pencil className='h-3.5 w-3.5' />
              {config?.webhookUrl ? 'Edit Webhook' : 'Configure Webhook'}
            </Button>
          </div>
        </div>
      </div>

      {config !== null && (
        <WebhookModal
          open={open}
          onClose={() => setOpen(false)}
          onUpdated={() => {
            setIsLoading(true)
            void load()
          }}
          webhookUrl={config.webhookUrl}
          hasWebhookSecret={config.hasWebhookSecret}
        />
      )}
    </div>
  )
}
