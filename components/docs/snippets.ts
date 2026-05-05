export function makeSnippets(origin: string) {
  return {
    loadScript: `<script src="${origin}/checkout.js"></script>`,

    basicButton: `<button onclick="Settlix.open({ linkId: 'YOUR_LINK_ID' })">
  Pay with Settlix
</button>`,

    // ── React quick-start ──────────────────────────────────────────────────
    reactLoadScript: `<!-- public/index.html — before </body> -->
<script src="${origin}/checkout.js"></script>`,

    reactMinimal: `// Any component — call window.Settlix.open() directly
<button onClick={() => window.Settlix.open({ linkId: 'YOUR_LINK_ID' })}>
  Pay with Settlix
</button>`,

    reactInstallTypes: `# TypeScript users — one command, types become globally available
bun add -D @settlix/types
# or: npm install --save-dev @settlix/types`,

    // ── Next.js quick-start ────────────────────────────────────────────────
    nextjsLayout: `// app/layout.tsx — add Script once, it loads on every page
import Script from 'next/script'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script src="${origin}/checkout.js" strategy="lazyOnload" />
      </body>
    </html>
  )
}`,

    nextjsMinimal: `'use client'  // window.Settlix only exists in the browser

// Any Client Component
export function PayButton() {
  return (
    <button onClick={() => window.Settlix.open({ linkId: 'YOUR_LINK_ID' })}>
      Pay with Settlix
    </button>
  )
}`,

    nextjsInstallTypes: `# TypeScript users — one command, types become globally available
bun add -D @settlix/types
# or: npm install --save-dev @settlix/types`,

    // ── Optional: reusable pre-styled component (React + Next.js) ─────────
    reusableComponent: `// Drop this anywhere in your project — no extra dependencies
// Next.js: add 'use client' at the top

type Size = 'sm' | 'md' | 'lg'

const STYLES: Record<Size, React.CSSProperties> = {
  sm: { display: 'inline-flex', alignItems: 'center', gap: 6,  borderRadius: 8,  background: '#4f46e5', padding: '6px 12px',  fontSize: 12, fontWeight: 600, color: '#fff', border: 'none', cursor: 'pointer' },
  md: { display: 'inline-flex', alignItems: 'center', gap: 8,  borderRadius: 12, background: '#4f46e5', padding: '10px 20px', fontSize: 14, fontWeight: 600, color: '#fff', border: 'none', cursor: 'pointer' },
  lg: { display: 'inline-flex', alignItems: 'center', gap: 10, borderRadius: 16, background: '#4f46e5', padding: '14px 32px', fontSize: 16, fontWeight: 700, color: '#fff', border: 'none', cursor: 'pointer' },
}

interface Props {
  linkId: string
  size?: Size
  label?: string
  metadata?: Record<string, unknown>
  onSuccess?: (txSignature: string, metadata: Record<string, unknown> | null) => void
  onClose?:   (metadata: Record<string, unknown> | null) => void
}

export function SettlixButton({ linkId, size = 'md', label = '⚡ Pay with Settlix', metadata, onSuccess, onClose }: Props) {
  return (
    <button
      style={STYLES[size]}
      onClick={() => window.Settlix.open({ linkId, metadata, onSuccess, onClose })}
    >
      {label}
    </button>
  )
}`,

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

    webhookPayload: `// Payment link payment
{
  "linkId":       "clxyz1234abcd",
  "txSignature":  "5Yf3...k9mZ",
  "userWallet":   "9xKp...wQ2r",
  "inputToken":   "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "inputAmount":  "25000000",
  "outputAmount": "25000000",
  "timestamp":    "2025-04-26T10:30:00.000Z",
  "metadata":     { "orderId": "order_789" }
}

// Invoice payment
{
  "invoiceId":    "clxyz5678efgh",
  "txSignature":  "5Yf3...k9mZ",
  "userWallet":   "9xKp...wQ2r",
  "inputToken":   "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "inputAmount":  "500000000",
  "outputAmount": "500000000",
  "timestamp":    "2025-04-26T10:30:00.000Z"
}

// Subscription payment (first payment or renewal)
{
  "subscriberId": "clxyz9012ijkl",
  "planId":       "clxyz3456mnop",
  "txSignature":  "5Yf3...k9mZ",
  "userWallet":   "9xKp...wQ2r",
  "inputToken":   "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "inputAmount":  "10000000",
  "outputAmount": "10000000",
  "timestamp":    "2025-04-26T10:30:00.000Z"
}

// All events include the signature header:
// X-Settlix-Signature: sha256=<hmac-hex>`,

    csp: `Content-Security-Policy:
  script-src  ${origin};
  frame-src   ${origin};
  connect-src ${origin};`,

    typescript: `/// <reference types="${origin}/checkout.d.ts" />
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
<script src="${origin}/checkout.js" async></script>`,
  }
}

export function makeApiSnippets(origin: string) {
  return {
    quickStart: `# Create a link from your server
curl -X POST ${origin}/api/links \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "token": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "amount": "25", "title": "Order #1234" }'

# Then open it client-side
Settlix.open({ linkId: "clxyz1234abcd", metadata: { orderId: "1234" } })`,

    getKeys: `# List your API keys
curl ${origin}/api/keys \\
  -H "Authorization: Bearer sk_live_..."`,

    createKey: `# Create a new API key (name it for your app)
curl -X POST ${origin}/api/keys \\
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

    revokeKey: `# Revoke a key by ID — returns 204 No Content
curl -X DELETE ${origin}/api/keys/clxyz... \\
  -H "Authorization: Bearer sk_live_..."`,

    createLink: `# Create a payment link
curl -X POST ${origin}/api/links \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "token":       "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amount":      "25.00",
    "title":       "Order #1234",
    "description": "2x Widget Pro"
  }'

# Response — 201 Created
{
  "id":      "clxyz1234abcd",
  "payPath": "/pay/clxyz1234abcd"
}`,

    listLinks: `# List all your payment links with stats
curl ${origin}/api/links \\
  -H "Authorization: Bearer sk_live_..."`,

    getLink: `# Get a single payment link (public — no auth needed)
curl ${origin}/api/links/clxyz1234abcd`,

    toggleLink: `# Deactivate a link
curl -X PATCH ${origin}/api/links/clxyz1234abcd \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "active": false }'`,

    configWebhook: `# Configure your webhook endpoint
curl -X PATCH ${origin}/api/webhook \\
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

    invoices: `# List all invoices
curl ${origin}/api/invoices \\
  -H "Authorization: Bearer sk_live_..."

# Create an invoice
curl -X POST ${origin}/api/invoices \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientName":  "Acme Corp",
    "clientEmail": "billing@acme.com",
    "token":       "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "dueDate":     "2025-06-01T00:00:00.000Z",
    "memo":        "Q2 retainer",
    "lineItems": [
      { "description": "Design work", "quantity": "1", "unitPrice": "500.00" },
      { "description": "Dev hours",   "quantity": "8", "unitPrice": "150.00" }
    ]
  }'

# Response — 201 Created
{
  "id":      "clxyz...",
  "linkId":  "clxyz...",
  "payPath": "/invoice/clxyz..."
}`,

    getInvoice: `# Get a single invoice (public — no auth needed)
curl ${origin}/api/invoices/clxyz...`,

    deleteInvoice: `# Archive an invoice — returns 204 No Content
curl -X DELETE ${origin}/api/invoices/clxyz... \\
  -H "Authorization: Bearer sk_live_..."`,

    sendInvoice: `# Send (or resend) the invoice email to the client
# Returns 409 INVOICE_ALREADY_PAID if the invoice has been paid
curl -X POST ${origin}/api/invoices/clxyz.../send \\
  -H "Authorization: Bearer sk_live_..."`,

    listPlans: `# List your subscription plans
curl ${origin}/api/subscription-plans \\
  -H "Authorization: Bearer sk_live_..."`,

    createPlan: `# Create a subscription plan
curl -X POST ${origin}/api/subscription-plans \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "token":       "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amount":      "10.00",
    "interval":    "weekly",
    "title":       "Pro Plan",
    "description": "Weekly access to all features"
  }'

# Response — 201 Created
{ "id": "clxyz1234abcd" }

# Share this URL with subscribers:
# ${origin}/subscribe/clxyz1234abcd`,

    togglePlan: `# Pause a plan (stops new subscriptions, existing ones continue)
curl -X PATCH ${origin}/api/subscription-plans/clxyz1234abcd \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "active": false }'

# Reactivate
curl -X PATCH ${origin}/api/subscription-plans/clxyz1234abcd \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "active": true }'`,

    archivePlan: `# Archive a plan — returns 204 No Content
curl -X DELETE ${origin}/api/subscription-plans/clxyz1234abcd \\
  -H "Authorization: Bearer sk_live_..."`,

    listSubscribers: `# List all subscribers across your plans
curl ${origin}/api/subscriptions \\
  -H "Authorization: Bearer sk_live_..."`,

    cancelSubscriber: `# Cancel a subscriber (merchant-initiated)
curl -X POST ${origin}/api/subscriptions/clxyz9012ijkl/cancel \\
  -H "Authorization: Bearer sk_live_..."`,

    errorShape: `// Every error response follows this shape
{
  "error": "Human-readable message",
  "code":  "MACHINE_READABLE_CODE",
  "issues": [...]           // only on validation errors (400)
}

// HTTP status codes used by this API
// 201 — resource created (POST)
// 204 — deleted (DELETE)
// 400 — bad request / validation failed
// 401 — missing or invalid API key
// 403 — forbidden (you don't own this resource)
// 404 — resource not found
// 409 — conflict (e.g. invoice already paid)
// 410 — gone (link expired or sold out)
// 502 — upstream failure (e.g. email delivery)
// 500 — server error`,
  }
}
