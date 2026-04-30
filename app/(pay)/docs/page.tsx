'use client'

import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  X,
  Copy,
  Check,
  Zap,
  ArrowRight,
  Terminal,
  Webhook,
  ShieldCheck,
  Code2,
  FileCode,
  Key,
  List,
  ToggleLeft,
} from 'lucide-react'
import { PayCardBase } from '@/components/pay/pay-card-base'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'

// ── Helpers ────────────────────────────────────────────────────────────────────

function useClientMounted() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  return mounted
}

function ts() {
  return new Date().toTimeString().slice(0, 8)
}

type LogEntry = { type: 'open' | 'success' | 'close'; msg: string; time: string }

// ── CodeBlock ──────────────────────────────────────────────────────────────────

function ColoredCode({ code }: { code: string }) {
  const tokens = code.split(
    /(\/\/.*|\b(?:function|const|let|var|return|if|else|console|document|window|interface|declare|global|type)\b|'.*?'|".*?"|\b\d+\b|[{}[\]()])/g,
  )

  return (
    <>
      {tokens.map((part, i) => {
        if (!part) return null
        if (part.startsWith('//'))
          return (
            <span key={i} className='text-zinc-500'>
              {part}
            </span>
          )
        if (
          [
            'function',
            'const',
            'let',
            'var',
            'return',
            'if',
            'else',
            'interface',
            'declare',
            'global',
            'type',
          ].includes(part)
        )
          return (
            <span key={i} className='text-pink-400'>
              {part}
            </span>
          )
        if (['console', 'document', 'window'].includes(part))
          return (
            <span key={i} className='text-blue-400'>
              {part}
            </span>
          )
        if (part.startsWith("'") || part.startsWith('"'))
          return (
            <span key={i} className='text-emerald-400'>
              {part}
            </span>
          )
        if (/^\d+$/.test(part))
          return (
            <span key={i} className='text-orange-400'>
              {part}
            </span>
          )
        if (['true', 'false', 'null', 'undefined'].includes(part))
          return (
            <span key={i} className='text-orange-400'>
              {part}
            </span>
          )
        if (['{', '}', '[', ']', '(', ')'].includes(part))
          return (
            <span key={i} className='text-zinc-400'>
              {part}
            </span>
          )
        return (
          <span key={i} className='text-zinc-300'>
            {part}
          </span>
        )
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
    <div className='group relative rounded-2xl border border-border/40 bg-zinc-950 shadow-sm overflow-hidden transition-all hover:border-border/80'>
      {/* Top bar */}
      <div className='flex items-center justify-between border-b border-white/10 bg-zinc-900/50 px-4 py-2.5'>
        <span className='text-[11px] font-semibold text-zinc-400 tracking-wider uppercase'>
          {label ?? 'javascript'}
        </span>
        <Button
          variant='ghost'
          size='xss'
          onClick={copy}
          className='flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200'
        >
          {copied ? (
            <>
              <Check className='h-3.5 w-3.5 text-emerald-400' />
              <span className='text-emerald-400'>Copied</span>
            </>
          ) : (
            <>
              <Copy className='h-3.5 w-3.5' />
              Copy
            </>
          )}
        </Button>
      </div>
      {/* Code */}
      <pre className='overflow-x-auto px-5 py-4 text-[13px] leading-[1.7] font-mono whitespace-pre'>
        <code>
          <ColoredCode code={code} />
        </code>
      </pre>
    </div>
  )
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({
  id,
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  id: string
  icon: React.ElementType
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5 }}
      id={id}
      className='scroll-mt-24 group relative rounded-3xl border border-border/40 bg-card/30 p-6 md:p-8 backdrop-blur-xl shadow-sm transition-all hover:bg-card/50 hover:shadow-md'
    >
      <div className='mb-6 flex items-start gap-4'>
        <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 dark:bg-indigo-400/10 ring-1 ring-indigo-500/20 dark:ring-indigo-400/20 transition-transform duration-300 group-hover:scale-110 group-hover:bg-indigo-500/15 dark:group-hover:bg-indigo-400/15'>
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

// ── Step badge ─────────────────────────────────────────────────────────────────

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className='flex gap-5'>
      <div className='flex flex-col items-center'>
        <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 dark:bg-indigo-400/10 text-[12px] font-bold text-indigo-500 dark:text-indigo-400 ring-1 ring-indigo-500/20 dark:ring-indigo-400/20'>
          {n}
        </div>
        <div className='mt-3 w-px flex-1 bg-border/50' />
      </div>
      <div className='pb-10 flex-1 min-w-0'>
        <p className='mb-4 text-base font-medium tracking-tight text-foreground'>{title}</p>
        <div className='space-y-4'>{children}</div>
      </div>
    </div>
  )
}

// ── Method badge ───────────────────────────────────────────────────────────────

function Method({ method, path }: { method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; path: string }) {
  const color: Record<string, string> = {
    GET: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
    POST: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
    PATCH: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
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
          ? 'bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-300 font-semibold'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      }`}
    >
      {label}
    </a>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

const ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'https://settlix.xyz'

const SNIPPETS = {
  loadScript: `<script src="${ORIGIN}/checkout.js"></script>`,

  basicButton: `<button onclick="Settlix.open({ linkId: 'YOUR_LINK_ID' })">
  Pay with Settlix
</button>`,

  fullApi: `Settlix.open({
  linkId: 'YOUR_LINK_ID',

  // Optional — pass any JSON you want echoed back
  metadata: {
    orderId: 'order_789',
    userId:  'user_456',
  },

  // Fires when payment is confirmed on-chain
  onSuccess: function(txSignature, metadata) {
    console.log('paid:', txSignature)
    console.log('order:', metadata.orderId)
  },

  // Fires on close, cancel, or failure
  onClose: function(metadata) {
    console.log('abandoned order:', metadata?.orderId)
  },
})

// Close programmatically (e.g. from your own UI)
Settlix.close()`,

  metadataExplained: `// Without metadata — you know SOMEONE paid, not WHO or WHAT ORDER
Settlix.open({ linkId: 'abc' })

// With metadata — you get back exactly what you put in
Settlix.open({
  linkId: 'abc',
  metadata: { orderId: 'order_789', userId: 'user_456', plan: 'pro' },
  onSuccess: function(txSignature, metadata) {
    // metadata.orderId → 'order_789'  ✓
    // metadata.userId  → 'user_456'   ✓
    fulfillOrder(metadata.orderId, txSignature)
  },
})`,

  webhookPayload: `// POST to your configured webhook URL on every successful payment
{
  "linkId":       "clxyz1234abcd",
  "txSignature":  "5Yf3...k9mZ",
  "userWallet":   "9xKp...wQ2r",
  "inputToken":   "So11111111111111111111111111111111111111112",
  "inputAmount":  "25.000000",
  "outputAmount": "25.000000",
  "timestamp":    "2025-04-26T10:30:00.000Z",
  "metadata": {
    "orderId": "order_789",
    "userId":  "user_456"
  }
}

// Verify the signature header
// X-Settlix-Signature: sha256=<hmac-hex>`,

  csp: `Content-Security-Policy:
  script-src  ${ORIGIN};
  frame-src   ${ORIGIN};
  connect-src ${ORIGIN};`,

  typescript: `/// <reference types="${ORIGIN}/checkout.d.ts" />
// or paste this into a global.d.ts file:

interface SettlixCheckout {
  open(opts: {
    linkId: string
    metadata?: Record<string, unknown>
    onSuccess?: (txSignature: string, metadata: Record<string, unknown> | null) => void
    onClose?:   (metadata: Record<string, unknown> | null) => void
  }): void
  close(): void
}

declare global {
  interface Window { Settlix: SettlixCheckout }
}`,

  async: `<!-- Optional: queue calls made before the script loads -->
<script>
  window.Settlix = { _q: [], open: function(o){ this._q.push(o) } }
</script>
<script src="${ORIGIN}/checkout.js" async></script>`,
}

const API_SNIPPETS = {
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
curl ${ORIGIN}/api/links/clxyz1234abcd`,

  toggleLink: `# Deactivate a link
curl -X PATCH ${ORIGIN}/api/links/clxyz1234abcd \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "active": false }'`,

  configWebhook: `# Set a webhook URL + signing secret on a link
curl -X POST ${ORIGIN}/api/links/clxyz1234abcd/webhook \\
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

export default function EmbedDocsPage() {
  const mounted = useClientMounted()
  const [linkId, setLinkId] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [activeSection, setActiveSection] = useState('embed-quick-start')

  const logColor: Record<LogEntry['type'], string> = {
    open: 'text-blue-400',
    success: 'text-emerald-400',
    close: 'text-orange-400',
  }

  useEffect(() => {
    const saved = sessionStorage.getItem('settlix_test_link_id')

    if (saved) setLinkId(saved)

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

  function push(entry: LogEntry) {
    setLog((prev) => [...prev, entry])
  }

  function openCheckout() {
    const id = linkId.trim()
    if (!id) return
    sessionStorage.setItem('settlix_test_link_id', id)
    setActiveId(id)
    push({ type: 'open', msg: `Settlix.open({ linkId: "${id}" })`, time: ts() })
  }

  const handlePaid = useCallback((txSignature: string) => {
    push({ type: 'success', msg: `Payment confirmed — ${txSignature || '(none)'}`, time: ts() })
    setTimeout(() => setActiveId(null), 1800)
  }, [])

  function handleClose() {
    setActiveId(null)
    push({ type: 'close', msg: 'User closed checkout', time: ts() })
  }

  useEffect(() => {
    if (!activeId) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [activeId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className='min-h-screen bg-background relative overflow-hidden'>
        {/* ── Layout ─────────────────────────────────────────────────────────── */}
        <div className='mx-auto max-w-6xl px-6 py-16 lg:flex lg:gap-16 relative z-10'>
          {/* ── Sticky sidebar TOC ─────────────────────────────────────────── */}
          <aside className='hidden lg:block w-56 shrink-0 relative'>
            <div className='fixed top-24 w-56 max-h-[calc(100vh-8rem)] overflow-y-auto pr-4'>
              <p className='mb-4 px-4 text-xs font-bold uppercase tracking-widest text-muted-foreground'>Embed SDK</p>
              <nav className='flex flex-col gap-1 mb-8'>
                <NavPill
                  href='#embed-quick-start'
                  label='Quick Start'
                  isActive={activeSection === 'embed-quick-start'}
                />
                <NavPill href='#live-demo' label='Live Demo' isActive={activeSection === 'live-demo'} />
                <NavPill href='#full-api' label='Full API' isActive={activeSection === 'full-api'} />
                <NavPill href='#order-tracking' label='Order Tracking' isActive={activeSection === 'order-tracking'} />
                <NavPill href='#embed-webhooks' label='Webhooks' isActive={activeSection === 'embed-webhooks'} />
                <NavPill href='#csp' label='CSP' isActive={activeSection === 'csp'} />
                <NavPill href='#typescript' label='TypeScript' isActive={activeSection === 'typescript'} />
                <NavPill href='#async' label='Async Loading' isActive={activeSection === 'async'} />
              </nav>

              <p className='mb-4 px-4 text-xs font-bold uppercase tracking-widest text-muted-foreground'>REST API</p>
              <nav className='flex flex-col gap-1'>
                <NavPill href='#authentication' label='Authentication' isActive={activeSection === 'authentication'} />
                <NavPill href='#api-quick-start' label='Quick Start' isActive={activeSection === 'api-quick-start'} />
                <NavPill href='#api-keys' label='API Keys' isActive={activeSection === 'api-keys'} />
                <NavPill href='#create-link' label='Create Link' isActive={activeSection === 'create-link'} />
                <NavPill href='#list-links' label='List Links' isActive={activeSection === 'list-links'} />
                <NavPill href='#manage-link' label='Manage a Link' isActive={activeSection === 'manage-link'} />
                <NavPill href='#api-webhooks' label='Webhooks' isActive={activeSection === 'api-webhooks'} />
                <NavPill href='#errors' label='Errors' isActive={activeSection === 'errors'} />
              </nav>
            </div>
          </aside>

          {/* ── Main content ───────────────────────────────────────────────── */}
          <main className='min-w-0 flex-1 space-y-16 pb-24 pt-16'>
            {/* Hero */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className='mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 dark:border-indigo-400/20 bg-indigo-500/10 dark:bg-indigo-400/10 px-4 py-1.5 backdrop-blur-md'>
                <Zap className='h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400' />
                <span className='text-[12px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400'>
                  Embed Docs
                </span>
              </div>
              <h1 className='text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.1] mb-6'>
                Accept Solana payments
                <br />
                <span className='text-muted-foreground'>on any website.</span>
              </h1>
              <p className='max-w-xl text-lg text-muted-foreground/80 leading-relaxed'>
                Drop one script tag and call{' '}
                <code className='rounded-md bg-muted/60 px-2 py-1 font-mono text-sm text-foreground border border-border/40'>
                  Settlix.open()
                </code>
                . No SDK, no wallet libraries, no framework required.
              </p>

              {/* How it works — 3 chips */}
              <div className='mt-10 flex flex-wrap gap-3'>
                {['Load checkout.js', 'Buyer pays in the modal', 'onSuccess fires'].map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className='flex items-center gap-3 rounded-full border border-border/40 bg-card/40 px-4 py-2 backdrop-blur-sm'
                  >
                    <span className='flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/15 dark:bg-indigo-400/15 text-[11px] font-bold text-indigo-600 dark:text-indigo-400'>
                      {i + 1}
                    </span>
                    <span className='text-sm font-medium text-foreground'>{s}</span>
                    {i < 2 && <ArrowRight className='h-4 w-4 text-muted-foreground/50 ml-1' />}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Quick Start */}
            <Section
              id='embed-quick-start'
              icon={Terminal}
              title='Quick Start'
              subtitle='Two steps to a working checkout button.'
            >
              <div className='mt-8'>
                <Step n={1} title='Load the checkout script once — anywhere in your HTML'>
                  <CodeBlock code={SNIPPETS.loadScript} label='html' />
                </Step>
                <Step n={2} title='Trigger the checkout from any button or link'>
                  <CodeBlock code={SNIPPETS.basicButton} label='html' />
                  <p className='mt-4 text-sm text-muted-foreground/80'>
                    Replace{' '}
                    <code className='rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-foreground border border-border/40'>
                      YOUR_LINK_ID
                    </code>{' '}
                    with the ID from your Settlix dashboard.
                  </p>
                </Step>
              </div>
            </Section>

            {/* Live Demo */}
            <Section
              id='live-demo'
              icon={Zap}
              title='Live Demo'
              subtitle='Enter your payment link ID and fire the checkout right here.'
            >
              <div className='rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-md'>
                <label className='mb-2.5 block text-sm font-medium text-foreground'>Payment Link ID</label>

                <div className='flex items-center gap-3 rounded-2xl border border-border/40 bg-muted/40 p-2 transition-all focus-within:border-indigo-500/40 dark:focus-within:border-indigo-400/40 focus-within:ring-2 focus-within:ring-indigo-500/10 dark:focus-within:ring-indigo-400/10'>
                  <input
                    value={linkId}
                    onChange={(e) => setLinkId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && openCheckout()}
                    placeholder='e.g. clxyz1234abcd'
                    spellCheck={false}
                    className='flex-1 bg-transparent px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/50'
                  />
                  <Button
                    onClick={openCheckout}
                    disabled={!linkId.trim()}
                    className='rounded-xl bg-indigo-600 dark:bg-indigo-500 px-6 font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 dark:hover:bg-indigo-600 active:scale-[0.98]'
                  >
                    Open Checkout
                  </Button>
                </div>

                {/* Event log */}
                <div className='mt-8'>
                  <div className='mb-2.5 flex items-center justify-between'>
                    <span className='text-[11px] font-bold uppercase tracking-widest text-muted-foreground'>
                      Event log
                    </span>
                    {log.length > 0 && (
                      <Button
                        variant='ghost'
                        size='xss'
                        onClick={() => setLog([])}
                        className='text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors'
                      >
                        Clear Log
                      </Button>
                    )}
                  </div>
                  <div className='min-h-[80px] rounded-xl border border-border/40 bg-zinc-950 p-4 font-mono text-[12px] leading-[1.8] shadow-inner'>
                    {log.length === 0 ? (
                      <span className='italic text-zinc-600'>Events will appear here…</span>
                    ) : (
                      <div className='space-y-1.5'>
                        {log.map((e, i) => (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            key={i}
                            className='flex gap-3'
                          >
                            <span className='shrink-0 text-zinc-500'>{e.time}</span>
                            <span className={`shrink-0 font-medium ${logColor[e.type]}`}>[{e.type}]</span>
                            <span className='break-all text-zinc-300'>{e.msg}</span>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Section>

            {/* Full API */}
            <Section
              id='full-api'
              icon={Code2}
              title='Full API Reference'
              subtitle='All options accepted by Settlix.open().'
            >
              <CodeBlock code={SNIPPETS.fullApi} label='javascript' />

              {/* Options table */}
              <div className='mt-6 overflow-hidden rounded-2xl border border-border/40 bg-card/30 shadow-sm'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='border-b border-border/40 bg-muted/40'>
                      <th className='px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground'>
                        Option
                      </th>
                      <th className='px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground'>
                        Type
                      </th>
                      <th className='px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground'>
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-border/30'>
                    {[
                      ['linkId', 'string', 'Required. Your payment link ID from the dashboard.'],
                      ['metadata', 'object', 'Optional. Any JSON — echoed back in onSuccess and onClose.'],
                      ['onSuccess', '(txSig, metadata) => void', 'Called when payment is confirmed on-chain.'],
                      ['onClose', '(metadata) => void', 'Called on close, cancel, or failure.'],
                    ].map(([opt, type, desc]) => (
                      <tr key={opt} className='transition-colors hover:bg-muted/20'>
                        <td className='px-5 py-4 font-mono text-[13px] text-indigo-600 dark:text-indigo-400 font-medium'>
                          {opt}
                        </td>
                        <td className='px-5 py-4 font-mono text-[13px] text-muted-foreground'>{type}</td>
                        <td className='px-5 py-4 text-[13px] text-foreground/80 leading-relaxed'>{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* Order Tracking */}
            <Section
              id='order-tracking'
              icon={FileCode}
              title='Order Tracking'
              subtitle='How to map a payment back to a specific order and user.'
            >
              <div className='mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-600 dark:text-amber-200/80 leading-relaxed'>
                <strong className='text-amber-700 dark:text-amber-300'>Without metadata</strong> — you know a payment
                was made but not <em>which order</em> or <em>which user</em> triggered it. Two customers buying the same
                product produce identical webhook payloads except for{' '}
                <code className='font-mono text-amber-700/80 dark:text-amber-200'>txSignature</code> and{' '}
                <code className='font-mono text-amber-700/80 dark:text-amber-200'>userWallet</code>.
              </div>
              <CodeBlock code={SNIPPETS.metadataExplained} label='javascript' />
              <p className='mt-4 text-[13px] text-muted-foreground/80 leading-relaxed'>
                <code className='rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-foreground border border-border/40'>
                  metadata
                </code>{' '}
                is stored alongside the transaction in Settlix and included in every webhook delivery — so your backend
                can correlate without relying solely on the client-side callback.
              </p>
            </Section>

            {/* Webhooks */}
            <Section
              id='embed-webhooks'
              icon={Webhook}
              title='Webhook Payload'
              subtitle='Settlix sends a signed POST to your endpoint on every confirmed payment.'
            >
              <CodeBlock code={SNIPPETS.webhookPayload} label='json' />
              <div className='mt-6 rounded-2xl border border-indigo-500/20 dark:border-indigo-400/20 bg-indigo-500/5 dark:bg-indigo-400/5 p-5 text-sm'>
                <p className='font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-2'>
                  <ShieldCheck className='h-4 w-4' /> Verifying the signature
                </p>
                <p className='mt-2 text-muted-foreground leading-relaxed'>
                  Compute{' '}
                  <code className='font-mono text-foreground bg-background rounded px-1 border border-border/40'>
                    HMAC-SHA256(body, webhookSecret)
                  </code>{' '}
                  and compare it to the hex value in{' '}
                  <code className='font-mono text-foreground bg-background rounded px-1 border border-border/40'>
                    X-Settlix-Signature
                  </code>
                  . Reject the request if they don&apos;t match.
                </p>
              </div>
            </Section>

            {/* CSP */}
            <Section
              id='csp'
              icon={ShieldCheck}
              title='Content Security Policy'
              subtitle='Add these directives if your site sets a CSP header.'
            >
              <CodeBlock code={SNIPPETS.csp} label='http header' />
              <p className='mt-4 text-[13px] text-muted-foreground/80'>
                <code className='rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-foreground border border-border/40'>
                  frame-src
                </code>{' '}
                allows the checkout iframe.{' '}
                <code className='rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-foreground border border-border/40'>
                  connect-src
                </code>{' '}
                allows API calls made from inside the iframe.
              </p>
            </Section>

            {/* TypeScript */}
            <Section
              id='typescript'
              icon={Code2}
              title='TypeScript'
              subtitle='Add types for window.Settlix — no npm package needed.'
            >
              <CodeBlock code={SNIPPETS.typescript} label='typescript' />
            </Section>

            {/* Async Loading */}
            <Section
              id='async'
              icon={Terminal}
              title='Async Script Loading'
              subtitle='Queue calls made before the script finishes loading.'
            >
              <CodeBlock code={SNIPPETS.async} label='html' />
              <p className='mt-4 text-[13px] text-muted-foreground/80 leading-relaxed'>
                If you load the script with{' '}
                <code className='rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-foreground border border-border/40'>
                  async
                </code>
                , calls to{' '}
                <code className='rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-foreground border border-border/40'>
                  Settlix.open()
                </code>{' '}
                before the script executes will be queued and replayed automatically.
              </p>
            </Section>

            {/* ── REST API Divider ─────────────────────────────────────────── */}
            <div className='my-24 h-px w-full bg-border/50' />

            {/* ── REST API SECTIONS ─────────────────────────────────────────── */}
            {/* Hero */}
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
                Create links, configure webhooks, and manage your account — all from your own server using a simple REST
                API and a Bearer token.
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
                  <strong className='text-amber-700 dark:text-amber-300'>Keep keys secret.</strong> Treat them like
                  passwords. If a key is compromised, revoke it immediately from your dashboard and create a new one.
                </div>
              </div>
            </Section>

            {/* Quick Start */}
            <Section
              id='api-quick-start'
              icon={Zap}
              title='Quick Start'
              subtitle='Create a payment link and get a URL in one request.'
            >
              <CodeBlock
                label='bash'
                code={`# Create a link from your server
curl -X POST ${ORIGIN}/api/create-link \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "token": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "amount": "25", "title": "Order #1234" }'

# Then open it client-side
Settlix.open({ linkId: "clxyz1234abcd", metadata: { orderId: "1234" } })`}
              />
            </Section>

            {/* API Keys */}
            <Section
              id='api-keys'
              icon={Key}
              title='API Keys'
              subtitle='Create and revoke API keys programmatically. Up to 10 keys per wallet.'
            >
              <div className='space-y-4'>
                <Method method='GET' path='/api/keys' />
                <CodeBlock label='bash' code={API_SNIPPETS.getKeys} />

                <div className='h-px bg-border/30' />

                <Method method='POST' path='/api/keys' />
                <CodeBlock label='bash' code={API_SNIPPETS.createKey} />
                <p className='text-sm text-muted-foreground'>
                  The raw key is returned <strong className='text-foreground'>once</strong> and never stored. Save it
                  immediately.
                </p>

                <div className='h-px bg-border/30' />

                <Method method='DELETE' path='/api/keys/:id' />
                <CodeBlock label='bash' code={API_SNIPPETS.revokeKey} />
              </div>
            </Section>

            {/* Create Link */}
            <Section
              id='create-link'
              icon={Terminal}
              title='Create a Payment Link'
              subtitle='POST /api/create-link — returns the link ID and its public pay URL.'
            >
              <Method method='POST' path='/api/create-link' />
              <CodeBlock label='bash' code={API_SNIPPETS.createLink} />

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

            {/* List Links */}
            <Section
              id='list-links'
              icon={List}
              title='List Payment Links'
              subtitle='GET /api/dashboard — returns all links with stats.'
            >
              <Method method='GET' path='/api/dashboard' />
              <CodeBlock label='bash' code={API_SNIPPETS.listLinks} />
              <p className='mt-4 text-sm text-muted-foreground'>
                Each link object includes{' '}
                <code className='rounded bg-muted/60 px-1.5 font-mono text-foreground'>stats.paidCount</code>,{' '}
                <code className='rounded bg-muted/60 px-1.5 font-mono text-foreground'>stats.totalVolume</code>, and up
                to 5 <code className='rounded bg-muted/60 px-1.5 font-mono text-foreground'>recentExecutions</code>.
              </p>
            </Section>

            {/* Manage Link */}
            <Section
              id='manage-link'
              icon={ToggleLeft}
              title='Manage a Link'
              subtitle='Get details or toggle a link active/inactive.'
            >
              <div className='space-y-4'>
                <Method method='GET' path='/api/links/:id' />
                <CodeBlock label='bash' code={API_SNIPPETS.getLink} />
                <p className='text-sm text-muted-foreground'>
                  Public endpoint — no auth required. Used by buyers before paying.
                </p>

                <div className='h-px bg-border/30' />

                <Method method='PATCH' path='/api/links/:id' />
                <CodeBlock label='bash' code={API_SNIPPETS.toggleLink} />
              </div>
            </Section>

            {/* Webhooks */}
            <Section
              id='api-webhooks'
              icon={Webhook}
              title='Webhooks'
              subtitle='Configure a webhook on a link — Settlix POSTs to your URL on every confirmed payment.'
            >
              <div className='space-y-4'>
                <Method method='POST' path='/api/links/:id/webhook' />
                <CodeBlock label='bash' code={API_SNIPPETS.configWebhook} />

                <div className='h-px bg-border/30' />

                <p className='text-sm font-medium text-foreground'>Verifying the signature</p>
                <CodeBlock label='javascript' code={API_SNIPPETS.verifyWebhook} />

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

            {/* Errors */}
            <Section
              id='errors'
              icon={Code2}
              title='Errors'
              subtitle='All errors follow a consistent JSON shape with a machine-readable code.'
            >
              <CodeBlock label='json' code={API_SNIPPETS.errorShape} />
            </Section>
          </main>
        </div>
      </div>

      {/* ── Checkout modal ──────────────────────────────────────────────────── */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {activeId && (
              <motion.div
                key='overlay'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className='fixed inset-0 z-100 flex items-center justify-center bg-background/80 backdrop-blur-md px-4'
              >
                <div className='relative z-10 flex w-full max-w-sm flex-col items-center gap-4'>
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 30 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className='absolute -top-3 right-0 z-10 mt-8 mr-4'
                  >
                    <Button
                      onClick={handleClose}
                      variant='outline'
                      size='icon'
                      aria-label='Close checkout'
                      className='flex h-8 w-8 items-center justify-center rounded-full bg-muted/80 text-muted-foreground shadow-md transition hover:bg-muted hover:text-foreground border-border/50 backdrop-blur-sm'
                    >
                      <X className='h-4 w-4' />
                    </Button>
                  </motion.div>
                  <PayCardBase linkId={activeId} onPaid={handlePaid} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  )
}
