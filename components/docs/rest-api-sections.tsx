'use client'

import { motion } from 'motion/react'
import {
  ArrowRight,
  Terminal,
  Webhook,
  ShieldCheck,
  Code2,
  Key,
  List,
  ToggleLeft,
  Zap,
  FileText,
  RefreshCw,
} from 'lucide-react'
import { Section } from './doc-section'
import { CodeBlock } from './code-block'
import { MethodBadge } from './method-badge'
import type { makeApiSnippets } from './snippets'

type ApiSnippets = ReturnType<typeof makeApiSnippets>

interface RestApiSectionsProps {
  apiSnippets: ApiSnippets
}

export function RestApiHero() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <div className='mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 backdrop-blur-md dark:border-indigo-400/20 dark:bg-indigo-400/10'>
        <Key className='h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400' />
        <span className='text-[12px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400'>
          REST API
        </span>
      </div>
      <h1 className='mb-6 text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl'>
        Settlix API
        <br />
        <span className='text-muted-foreground'>for your backend.</span>
      </h1>
      <p className='max-w-xl text-lg leading-relaxed text-muted-foreground/80'>
        Create links, configure webhooks, and manage your account — all from your own server using a simple REST API and
        a Bearer token.
      </p>

      <div className='mt-10 flex flex-wrap gap-3'>
        {['Get an API key', 'Authenticate with Bearer', 'Call any endpoint'].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className='flex items-center gap-3 rounded-full border border-border/40 bg-card/40 px-4 py-2 backdrop-blur-sm'
          >
            <span className='flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/15 text-[11px] font-bold text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-400'>
              {i + 1}
            </span>
            <span className='text-sm font-medium text-foreground'>{s}</span>
            {i < 2 && <ArrowRight className='ml-1 h-4 w-4 text-muted-foreground/50' />}
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export function RestApiSections({ apiSnippets }: RestApiSectionsProps) {
  return (
    <>
      <Section
        id='authentication'
        icon={ShieldCheck}
        title='Authentication'
        subtitle='All protected endpoints accept a Bearer token in the Authorization header.'
      >
        <CodeBlock label='http header' code={`Authorization: Bearer sk_live_<your-key>`} />
        <div className='mt-4 space-y-3 text-sm text-muted-foreground'>
          <p>API keys are scoped to your merchant wallet — they can do everything your dashboard session can.</p>
          <div className='rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-amber-600 dark:text-amber-200/80'>
            <strong className='text-amber-700 dark:text-amber-300'>Keep keys secret.</strong> Treat them like passwords.
            If a key is compromised, revoke it immediately from your dashboard and create a new one.
          </div>
        </div>
      </Section>

      <Section
        id='api-quick-start'
        icon={Zap}
        title='Quick Start'
        subtitle='Create a payment link and get a URL in one request.'
      >
        <CodeBlock label='bash' code={apiSnippets.quickStart} />
      </Section>

      <Section
        id='api-keys'
        icon={Key}
        title='API Keys'
        subtitle='Create and revoke API keys programmatically. Up to 10 keys per wallet.'
      >
        <div className='space-y-4'>
          <MethodBadge method='GET' path='/api/keys' />
          <CodeBlock label='bash' code={apiSnippets.getKeys} />

          <div className='h-px bg-border/30' />

          <MethodBadge method='POST' path='/api/keys' />
          <CodeBlock label='bash' code={apiSnippets.createKey} />
          <p className='text-sm text-muted-foreground'>
            The raw key is returned <strong className='text-foreground'>once</strong> and never stored. Save it
            immediately.
          </p>

          <div className='h-px bg-border/30' />

          <MethodBadge method='DELETE' path='/api/keys/:id' />
          <CodeBlock label='bash' code={apiSnippets.revokeKey} />
        </div>
      </Section>

      <Section
        id='create-link'
        icon={Terminal}
        title='Create a Payment Link'
        subtitle='Returns the link ID and its public pay URL.'
      >
        <MethodBadge method='POST' path='/api/links' />
        <CodeBlock label='bash' code={apiSnippets.createLink} />

        <div className='mt-6 overflow-hidden rounded-2xl border border-border/40 bg-card/30 shadow-sm'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-border/40 bg-muted/40'>
                {['Field', 'Type', 'Description'].map((h) => (
                  <th
                    key={h}
                    className='px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground'
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className='divide-y divide-border/30'>
              {[
                ['token', 'string', 'Required. Settlement token mint address (USDC).'],
                ['amount', 'string', 'Required. Human-decimal amount, e.g. "25.00".'],
                ['title', 'string?', 'Optional. Shown to the buyer at checkout.'],
                ['description', 'string?', 'Optional. Up to 300 characters.'],
                ['expiresAt', 'ISO 8601?', 'Optional. Link stops accepting payments after this time.'],
                ['maxUses', 'number?', 'Optional. Maximum number of successful payments.'],
                ['recipients', 'array?', 'Optional. Revenue split — basis points must sum to 10000.'],
              ].map(([f, t, d]) => (
                <tr key={f} className='transition-colors hover:bg-muted/20'>
                  <td className='px-5 py-3.5 font-mono text-[13px] font-medium text-indigo-600 dark:text-indigo-400'>
                    {f}
                  </td>
                  <td className='px-5 py-3.5 font-mono text-[13px] text-muted-foreground'>{t}</td>
                  <td className='px-5 py-3.5 text-[13px] leading-relaxed text-foreground/80'>{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        id='list-links'
        icon={List}
        title='List Payment Links'
        subtitle='Returns all links with stats and recent executions.'
      >
        <MethodBadge method='GET' path='/api/links' />
        <CodeBlock label='bash' code={apiSnippets.listLinks} />
        <p className='mt-4 text-sm text-muted-foreground'>
          Each link object includes{' '}
          <code className='rounded bg-muted/60 px-1.5 font-mono text-foreground'>stats.paidCount</code>,{' '}
          <code className='rounded bg-muted/60 px-1.5 font-mono text-foreground'>stats.totalVolume</code>, and up to 5{' '}
          <code className='rounded bg-muted/60 px-1.5 font-mono text-foreground'>recentExecutions</code>.
        </p>
      </Section>

      <Section
        id='manage-link'
        icon={ToggleLeft}
        title='Manage a Link'
        subtitle='Get details or toggle a link active/inactive.'
      >
        <div className='space-y-4'>
          <MethodBadge method='GET' path='/api/links/:id' />
          <CodeBlock label='bash' code={apiSnippets.getLink} />
          <p className='text-sm text-muted-foreground'>
            Public endpoint — no auth required. Used by buyers before paying.
          </p>

          <div className='h-px bg-border/30' />

          <MethodBadge method='PATCH' path='/api/links/:id' />
          <CodeBlock label='bash' code={apiSnippets.toggleLink} />
        </div>
      </Section>

      <Section
        id='invoices'
        icon={FileText}
        title='Invoices'
        subtitle='Create and send invoices — clients pay via a dedicated invoice page.'
      >
        <div className='space-y-4'>
          <CodeBlock label='bash' code={apiSnippets.invoices} />

          <div className='mt-6 overflow-hidden rounded-2xl border border-border/40 bg-card/30 shadow-sm'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-border/40 bg-muted/40'>
                  {['Field', 'Type', 'Description'].map((h) => (
                    <th
                      key={h}
                      className='px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground'
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y divide-border/30'>
                {[
                  ['clientName', 'string?', 'Optional. Shown in the invoice and email.'],
                  [
                    'clientEmail',
                    'string?',
                    'Optional. If set, invoice email is sent on creation and a receipt on payment.',
                  ],
                  ['token', 'string', 'Required. Settlement token mint address (USDC).'],
                  ['dueDate', 'ISO 8601?', 'Optional. After this date the invoice is marked overdue.'],
                  ['memo', 'string?', 'Optional. Internal note shown on the invoice.'],
                  ['lineItems', 'array', 'Required. At least one item with description, quantity, and unitPrice.'],
                ].map(([f, t, d]) => (
                  <tr key={f} className='transition-colors hover:bg-muted/20'>
                    <td className='px-5 py-3.5 font-mono text-[13px] font-medium text-indigo-600 dark:text-indigo-400'>
                      {f}
                    </td>
                    <td className='px-5 py-3.5 font-mono text-[13px] text-muted-foreground'>{t}</td>
                    <td className='px-5 py-3.5 text-[13px] leading-relaxed text-foreground/80'>{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className='h-px bg-border/30' />

          <MethodBadge method='GET' path='/api/invoices/:id' />
          <CodeBlock label='bash' code={apiSnippets.getInvoice} />
          <p className='text-sm text-muted-foreground'>
            Public endpoint — no auth required. Used by the client to view and pay the invoice.
          </p>

          <div className='h-px bg-border/30' />

          <MethodBadge method='DELETE' path='/api/invoices/:id' />
          <CodeBlock label='bash' code={apiSnippets.deleteInvoice} />

          <div className='h-px bg-border/30' />

          <MethodBadge method='POST' path='/api/invoices/:id/send' />
          <CodeBlock label='bash' code={apiSnippets.sendInvoice} />
          <div className='rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-600 dark:text-amber-200/80'>
            <strong className='text-amber-700 dark:text-amber-300'>Already paid?</strong> A receipt email is sent
            automatically when the client pays. Calling this endpoint on an already-paid invoice returns{' '}
            <code className='font-mono text-amber-700/80 dark:text-amber-200'>409 INVOICE_ALREADY_PAID</code>.
          </div>
        </div>
      </Section>

      <Section
        id='subscriptions'
        icon={RefreshCw}
        title='Subscriptions'
        subtitle='Create recurring payment plans and manage subscribers.'
      >
        <div className='space-y-4'>
          <p className='text-sm text-muted-foreground leading-relaxed'>
            Subscribers authorize an SPL token delegation from the{' '}
            <code className='rounded bg-muted/60 px-1.5 font-mono text-foreground'>/subscribe/:planId</code> page. The
            relayer then charges them automatically at each renewal. Merchants get a webhook on every successful charge.
          </p>

          <MethodBadge method='GET' path='/api/subscription-plans' />
          <CodeBlock label='bash' code={apiSnippets.listPlans} />

          <div className='h-px bg-border/30' />

          <MethodBadge method='POST' path='/api/subscription-plans' />
          <CodeBlock label='bash' code={apiSnippets.createPlan} />

          <div className='mt-6 overflow-hidden rounded-2xl border border-border/40 bg-card/30 shadow-sm'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-border/40 bg-muted/40'>
                  {['Field', 'Type', 'Description'].map((h) => (
                    <th
                      key={h}
                      className='px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground'
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y divide-border/30'>
                {[
                  ['token', 'string', 'Required. Settlement token mint address (USDC).'],
                  ['amount', 'string', 'Required. Amount charged per interval, e.g. "10.00".'],
                  ['interval', '"daily" | "weekly"', 'Required. Billing frequency.'],
                  ['title', 'string?', 'Optional. Shown to subscribers at sign-up.'],
                  ['description', 'string?', 'Optional. Up to 300 characters.'],
                ].map(([f, t, d]) => (
                  <tr key={f} className='transition-colors hover:bg-muted/20'>
                    <td className='px-5 py-3.5 font-mono text-[13px] font-medium text-indigo-600 dark:text-indigo-400'>
                      {f}
                    </td>
                    <td className='px-5 py-3.5 font-mono text-[13px] text-muted-foreground'>{t}</td>
                    <td className='px-5 py-3.5 text-[13px] leading-relaxed text-foreground/80'>{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className='h-px bg-border/30' />

          <MethodBadge method='PATCH' path='/api/subscription-plans/:id' />
          <CodeBlock label='bash' code={apiSnippets.togglePlan} />
          <p className='text-sm text-muted-foreground'>
            Pausing a plan prevents new sign-ups but does not cancel existing subscribers.
          </p>

          <div className='h-px bg-border/30' />

          <MethodBadge method='DELETE' path='/api/subscription-plans/:id' />
          <CodeBlock label='bash' code={apiSnippets.archivePlan} />

          <div className='h-px bg-border/30' />

          <MethodBadge method='GET' path='/api/subscriptions' />
          <CodeBlock label='bash' code={apiSnippets.listSubscribers} />

          <div className='h-px bg-border/30' />

          <MethodBadge method='POST' path='/api/subscriptions/:id/cancel' />
          <CodeBlock label='bash' code={apiSnippets.cancelSubscriber} />
          <p className='text-sm text-muted-foreground'>
            Subscribers can also self-cancel from their{' '}
            <code className='rounded bg-muted/60 px-1.5 font-mono text-foreground'>/manage/:subscriberId</code> page by
            connecting the wallet they subscribed with.
          </p>

          <div className='rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-sm dark:border-indigo-400/20 dark:bg-indigo-400/5'>
            <p className='font-semibold text-indigo-600 dark:text-indigo-400'>Renewal schedule</p>
            <p className='mt-1 leading-relaxed text-muted-foreground'>
              Renewals run at midnight UTC. The relayer attempts each charge up to 3 times (10 PM, 11 PM, 12 AM). If all
              attempts fail the subscriber is cancelled and notified by email.
            </p>
          </div>
        </div>
      </Section>

      <Section
        id='api-webhooks'
        icon={Webhook}
        title='Webhooks'
        subtitle='Configure a webhook — Settlix POSTs to your URL on every confirmed payment.'
      >
        <div className='space-y-4'>
          <MethodBadge method='PATCH' path='/api/webhook' />
          <CodeBlock label='bash' code={apiSnippets.configWebhook} />

          <div className='h-px bg-border/30' />

          <p className='text-sm font-medium text-foreground'>Verifying the signature</p>
          <CodeBlock label='javascript' code={apiSnippets.verifyWebhook} />

          <div className='rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 text-sm dark:border-indigo-400/20 dark:bg-indigo-400/5'>
            <p className='font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-2'>
              <ShieldCheck className='h-4 w-4' /> Always verify the signature
            </p>
            <p className='mt-2 leading-relaxed text-muted-foreground'>
              Compare the header value to{' '}
              <code className='rounded bg-background px-1 font-mono text-foreground border border-border/40'>
                sha256=HMAC(rawBody, webhookSecret)
              </code>{' '}
              using a timing-safe comparison. Reject requests that don&apos;t match.
            </p>
          </div>
        </div>
      </Section>

      <Section
        id='errors'
        icon={Code2}
        title='Errors'
        subtitle='All errors follow a consistent JSON shape with a machine-readable code.'
      >
        <CodeBlock label='json' code={apiSnippets.errorShape} />
      </Section>
    </>
  )
}
