'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Copy, Check, Key, Terminal, Webhook, ShieldCheck, Code2, Zap, ArrowRight, List, ToggleLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ── CodeBlock (shared pattern from /docs) ─────────────────────────────────────

function ColoredCode({ code }: { code: string }) {
  const tokens = code.split(
    /(\/\/.*|#.*|\b(?:function|const|let|var|return|if|else|null|true|false)\b|".*?"|'.*?'|`.*?`|\b\d+\b|[{}[\]()])/g,
  )
  return (
    <>
      {tokens.map((part, i) => {
        if (!part) return null
        if (part.startsWith('//') || part.startsWith('#'))
          return <span key={i} className='text-zinc-500'>{part}</span>
        if (['function','const','let','var','return','if','else'].includes(part))
          return <span key={i} className='text-pink-400'>{part}</span>
        if (['null','true','false'].includes(part))
          return <span key={i} className='text-orange-400'>{part}</span>
        if (part.startsWith('"') || part.startsWith("'") || part.startsWith('`'))
          return <span key={i} className='text-emerald-400'>{part}</span>
        if (/^\d+$/.test(part))
          return <span key={i} className='text-orange-400'>{part}</span>
        if (['{','}','[',']','(',')'].includes(part))
          return <span key={i} className='text-zinc-400'>{part}</span>
        return <span key={i} className='text-zinc-300'>{part}</span>
      })}
    </>
  )
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div className='group relative overflow-hidden rounded-2xl border border-border/40 bg-zinc-950 shadow-sm transition-all hover:border-border/80'>
      <div className='flex items-center justify-between border-b border-white/10 bg-zinc-900/50 px-4 py-2.5'>
        <span className='text-[11px] font-semibold uppercase tracking-wider text-zinc-400'>{label ?? 'bash'}</span>
        <Button
          variant='ghost'
          size='xss'
          onClick={copy}
          className='flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200'
        >
          {copied ? (
            <><Check className='h-3.5 w-3.5 text-emerald-400' /><span className='text-emerald-400'>Copied</span></>
          ) : (
            <><Copy className='h-3.5 w-3.5' />Copy</>
          )}
        </Button>
      </div>
      <pre className='overflow-x-auto whitespace-pre px-5 py-4 font-mono text-[13px] leading-[1.7]'>
        <code><ColoredCode code={code} /></code>
      </pre>
    </div>
  )
}

// ── Section ────────────────────────────────────────────────────────────────────

function Section({ id, icon: Icon, title, subtitle, children }: {
  id: string; icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5 }}
      className='scroll-mt-24 group relative rounded-3xl border border-border/40 bg-card/30 p-6 shadow-sm backdrop-blur-xl transition-all hover:bg-card/50 hover:shadow-md md:p-8'
    >
      <div className='mb-6 flex items-start gap-4'>
        <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 ring-1 ring-indigo-500/20 transition-transform duration-300 group-hover:scale-110 group-hover:bg-indigo-500/15 dark:bg-indigo-400/10 dark:ring-indigo-400/20 dark:group-hover:bg-indigo-400/15'>
          <Icon className='h-5 w-5 text-indigo-500 dark:text-indigo-400' />
        </div>
        <div>
          <h2 className='text-xl font-semibold tracking-tight text-foreground'>{title}</h2>
          {subtitle && <p className='mt-1 text-sm text-muted-foreground'>{subtitle}</p>}
        </div>
      </div>
      {children}
    </motion.section>
  )
}

// ── Method badge ───────────────────────────────────────────────────────────────

function Method({ method, path }: { method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; path: string }) {
  const color: Record<string, string> = {
    GET:    'bg-blue-500/10 text-blue-400 ring-blue-500/20',
    POST:   'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
    PATCH:  'bg-amber-500/10 text-amber-400 ring-amber-500/20',
    DELETE: 'bg-red-500/10 text-red-400 ring-red-500/20',
  }
  return (
    <div className='mb-4 flex items-center gap-3'>
      <span className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold uppercase ring-1 ${color[method]}`}>
        {method}
      </span>
      <code className='font-mono text-sm text-foreground/80'>{path}</code>
    </div>
  )
}

// ── Nav pill ───────────────────────────────────────────────────────────────────

function NavPill({ href, label, isActive }: { href: string; label: string; isActive?: boolean }) {
  return (
    <a
      href={href}
      className={`block rounded-xl px-4 py-2 text-sm transition-all duration-200 ${
        isActive
          ? 'bg-indigo-500/10 font-semibold text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      }`}
    >
      {label}
    </a>
  )
}

// ── Snippets ───────────────────────────────────────────────────────────────────

const ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'https://settlix.xyz'

const S = {
  getKeys: `# List your API keys
curl ${ORIGIN}/api/keys \\
  -H "Authorization: Bearer sk_live_..."`,

  createKey: `# Create a new API key (name it for your app)
curl -X POST ${ORIGIN}/api/keys \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "name": "My Shopify store" }'

# Response — save this key, it is shown ONCE
{
  "id": "clxyz...",
  "name": "My Shopify store",
  "key": "sk_live_a1b2c3...",
  "createdAt": "2025-04-26T10:00:00.000Z"
}`,

  revokeKey: `# Revoke a key by ID
curl -X DELETE ${ORIGIN}/api/keys/clxyz... \\
  -H "Authorization: Bearer sk_live_..."`,

  createLink: `# Create a payment link
curl -X POST ${ORIGIN}/api/create-link \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "token":       "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amount":      "25.00",
    "title":       "Order #1234",
    "description": "2x Widget Pro"
  }'

# Response
{
  "id":      "clxyz1234abcd",
  "payPath": "/pay/clxyz1234abcd"
}`,

  listLinks: `# List all your payment links + stats
curl ${ORIGIN}/api/dashboard \\
  -H "Authorization: Bearer sk_live_..."`,

  getLink: `# Get a single payment link (public — no auth needed)
curl ${ORIGIN}/api/link/clxyz1234abcd`,

  toggleLink: `# Deactivate a link
curl -X PATCH ${ORIGIN}/api/link/clxyz1234abcd \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "active": false }'`,

  configWebhook: `# Set a webhook URL + signing secret on a link
curl -X POST ${ORIGIN}/api/link/clxyz1234abcd/webhook \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "webhookUrl":    "https://yoursite.com/api/settlix-webhook",
    "webhookSecret": "your-32-char-secret"
  }'`,

  verifyWebhook: `// Node.js — verify incoming webhook
const crypto = require('crypto')

function verifySettlixWebhook(rawBody, signature, secret) {
  const expected = 'sha256=' +
    crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected),
  )
}`,

  errorShape: `// Every error response follows this shape
{
  "error": "Human-readable message",
  "code":  "MACHINE_READABLE_CODE",  // for programmatic handling
  "issues": [...]                    // only present on validation errors
}

// HTTP status codes
// 400 — bad request / validation failed
// 401 — missing or invalid auth
// 404 — resource not found
// 500 — server error`,
}

// ── Page ───────────────────────────────────────────────────────────────────────

const NAV = [
  { href: '#authentication', label: 'Authentication' },
  { href: '#quick-start',    label: 'Quick Start' },
  { href: '#api-keys',       label: 'API Keys' },
  { href: '#create-link',    label: 'Create Link' },
  { href: '#list-links',     label: 'List Links' },
  { href: '#manage-link',    label: 'Manage a Link' },
  { href: '#webhooks',       label: 'Webhooks' },
  { href: '#errors',         label: 'Errors' },
]

export default function ApiDocsPage() {
  const [activeSection, setActiveSection] = useState('authentication')

  useEffect(() => {
    const activeSections = new Set<string>()

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            activeSections.add(entry.target.id)
          } else {
            activeSections.delete(entry.target.id)
          }
        })

        const sections = Array.from(document.querySelectorAll('section[id]')).map((s) => s.id)
        const topMost = sections.find((id) => activeSections.has(id))
        if (topMost) {
          setActiveSection(topMost)
        }
      },
      { rootMargin: '-10% 0px -50% 0px' },
    )

    const sections = document.querySelectorAll('section[id]')
    sections.forEach((s) => observer.observe(s))

    return () => observer.disconnect()
  }, [])

  return (
    <div className='min-h-screen bg-background relative overflow-hidden'>
      <div className='mx-auto max-w-6xl px-6 py-16 lg:flex lg:gap-16 relative z-10'>

      {/* ── Sticky sidebar ──────────────────────────────────────────────────── */}
      <aside className='hidden lg:block w-56 shrink-0'>
        <div className='fixed top-24 w-56 max-h-[calc(100vh-8rem)] overflow-y-auto pr-4'>
          <p className='mb-4 px-4 text-xs font-bold uppercase tracking-widest text-muted-foreground'>
            REST API
          </p>
          <nav className='flex flex-col gap-1'>
            {NAV.map(n => (
              <NavPill key={n.href} href={n.href} label={n.label} isActive={activeSection === n.href.slice(1)} />
            ))}
          </nav>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className='min-w-0 flex-1 space-y-16 pb-24'>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className='mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 backdrop-blur-md dark:border-indigo-400/20 dark:bg-indigo-400/10'>
            <Key className='h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400' />
            <span className='text-[12px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400'>
              REST API
            </span>
          </div>
          <h1 className='mb-6 text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl'>
            Settlix API<br />
            <span className='text-muted-foreground'>for your backend.</span>
          </h1>
          <p className='max-w-xl text-lg leading-relaxed text-muted-foreground/80'>
            Create links, configure webhooks, and manage your account — all from your own server using a simple REST API and a Bearer token.
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

        {/* Authentication */}
        <Section id='authentication' icon={ShieldCheck} title='Authentication' subtitle='All protected endpoints accept a Bearer token in the Authorization header.'>
          <CodeBlock label='http header' code={`Authorization: Bearer sk_live_<your-key>`} />
          <div className='mt-4 space-y-3 text-sm text-muted-foreground'>
            <p>API keys are scoped to your merchant wallet — they can do everything your dashboard session can.</p>
            <div className='rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-amber-600 dark:text-amber-200/80'>
              <strong className='text-amber-700 dark:text-amber-300'>Keep keys secret.</strong> Treat them like passwords. If a key is compromised, revoke it immediately from your dashboard and create a new one.
            </div>
          </div>
        </Section>

        {/* Quick Start */}
        <Section id='quick-start' icon={Zap} title='Quick Start' subtitle='Create a payment link and get a URL in one request.'>
          <CodeBlock label='bash' code={`# Create a link from your server
curl -X POST ${ORIGIN}/api/create-link \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "token": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "amount": "25", "title": "Order #1234" }'

# Then open it client-side
Settlix.open({ linkId: "clxyz1234abcd", metadata: { orderId: "1234" } })`} />
        </Section>

        {/* API Keys */}
        <Section id='api-keys' icon={Key} title='API Keys' subtitle='Create and revoke API keys programmatically. Up to 10 keys per wallet.'>
          <div className='space-y-4'>
            <Method method='GET' path='/api/keys' />
            <CodeBlock label='bash' code={S.getKeys} />

            <div className='h-px bg-border/30' />

            <Method method='POST' path='/api/keys' />
            <CodeBlock label='bash' code={S.createKey} />
            <p className='text-sm text-muted-foreground'>
              The raw key is returned <strong className='text-foreground'>once</strong> and never stored. Save it immediately.
            </p>

            <div className='h-px bg-border/30' />

            <Method method='DELETE' path='/api/keys/:id' />
            <CodeBlock label='bash' code={S.revokeKey} />
          </div>
        </Section>

        {/* Create Link */}
        <Section id='create-link' icon={Terminal} title='Create a Payment Link' subtitle='POST /api/create-link — returns the link ID and its public pay URL.'>
          <Method method='POST' path='/api/create-link' />
          <CodeBlock label='bash' code={S.createLink} />

          <div className='mt-6 overflow-hidden rounded-2xl border border-border/40 bg-card/30 shadow-sm'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-border/40 bg-muted/40'>
                  {['Field','Type','Description'].map(h => (
                    <th key={h} className='px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground'>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y divide-border/30'>
                {[
                  ['token',       'string',   'Required. Settlement token mint address (USDC).'],
                  ['amount',      'string',   'Required. Human-decimal amount, e.g. "25.00".'],
                  ['title',       'string?',  'Optional. Shown to the buyer at checkout.'],
                  ['description', 'string?',  'Optional. Up to 300 characters.'],
                  ['expiresAt',   'ISO 8601?','Optional. Link stops accepting payments after this time.'],
                  ['maxUses',     'number?',  'Optional. Maximum number of successful payments.'],
                  ['recipients',  'array?',   'Optional. Revenue split — basis points must sum to 10000.'],
                ].map(([f, t, d]) => (
                  <tr key={f} className='transition-colors hover:bg-muted/20'>
                    <td className='px-5 py-3.5 font-mono text-[13px] font-medium text-indigo-600 dark:text-indigo-400'>{f}</td>
                    <td className='px-5 py-3.5 font-mono text-[13px] text-muted-foreground'>{t}</td>
                    <td className='px-5 py-3.5 text-[13px] leading-relaxed text-foreground/80'>{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* List Links */}
        <Section id='list-links' icon={List} title='List Payment Links' subtitle='GET /api/dashboard — returns all links with stats.'>
          <Method method='GET' path='/api/dashboard' />
          <CodeBlock label='bash' code={S.listLinks} />
          <p className='mt-4 text-sm text-muted-foreground'>
            Each link object includes <code className='rounded bg-muted/60 px-1.5 font-mono text-foreground'>stats.paidCount</code>, <code className='rounded bg-muted/60 px-1.5 font-mono text-foreground'>stats.totalVolume</code>, and up to 5 <code className='rounded bg-muted/60 px-1.5 font-mono text-foreground'>recentExecutions</code>.
          </p>
        </Section>

        {/* Manage Link */}
        <Section id='manage-link' icon={ToggleLeft} title='Manage a Link' subtitle='Get details or toggle a link active/inactive.'>
          <div className='space-y-4'>
            <Method method='GET' path='/api/link/:id' />
            <CodeBlock label='bash' code={S.getLink} />
            <p className='text-sm text-muted-foreground'>Public endpoint — no auth required. Used by buyers before paying.</p>

            <div className='h-px bg-border/30' />

            <Method method='PATCH' path='/api/link/:id' />
            <CodeBlock label='bash' code={S.toggleLink} />
          </div>
        </Section>

        {/* Webhooks */}
        <Section id='webhooks' icon={Webhook} title='Webhooks' subtitle='Configure a webhook on a link — Settlix POSTs to your URL on every confirmed payment.'>
          <div className='space-y-4'>
            <Method method='POST' path='/api/link/:id/webhook' />
            <CodeBlock label='bash' code={S.configWebhook} />

            <div className='h-px bg-border/30' />

            <p className='text-sm font-medium text-foreground'>Verifying the signature</p>
            <CodeBlock label='javascript' code={S.verifyWebhook} />

            <div className='rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 text-sm dark:border-indigo-400/20 dark:bg-indigo-400/5'>
              <p className='font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-2'>
                <ShieldCheck className='h-4 w-4' /> Always verify the signature
              </p>
              <p className='mt-2 leading-relaxed text-muted-foreground'>
                Compare the header value to <code className='rounded bg-background px-1 font-mono text-foreground border border-border/40'>sha256=HMAC(rawBody, webhookSecret)</code> using a timing-safe comparison. Reject requests that don&apos;t match.
              </p>
            </div>
          </div>
        </Section>

        {/* Errors */}
        <Section id='errors' icon={Code2} title='Errors' subtitle='All errors follow a consistent JSON shape with a machine-readable code.'>
          <CodeBlock label='json' code={S.errorShape} />
        </Section>

      </main>
      </div>
    </div>
  )
}
