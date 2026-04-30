# Settlix — Feature Backlog

Sources: competitive landscape analysis (April 2026) + codebase audit. Previous Colosseum Copilot
research (5,400+ hackathon projects) validated the Jupiter multi-token swap as a genuine differentiator
— that is now shipped. This backlog focuses on what to build next to widen the moat.

**Already shipped (don't rebuild):**

- Real-time SSE notifications on payment
- QR code — dashboard + Phantom/Solana Pay flow
- "Pay with any token" via Jupiter swap
- Swap receipt on confirmation overlay
- Solscan/Explorer deep links
- Revenue split (up to 9 partners, basis points)
- Manual distribution workflow with `distributedAt` tracking
- Title + description on payment links (schema + UI both present)

---

## Tier 1 — Build next (high impact, achievable)

---

### 1. Webhooks on Payment Confirmation

**Why:** Turns Settlix from a UI tool into B2B infrastructure. When a payment lands, merchants
need to trigger fulfillment — send an email, grant Discord access, update a database, ship an
order. Right now they have SSE (browser-only). Webhooks work server-to-server, always. No
Solana-native non-custodial payment tool does this today. Helio doesn't. SpherePay doesn't have
a public webhook story. This is table stakes for any payment API targeting businesses.

**Schema changes** (`prisma/schema.prisma`):

```prisma
model PaymentLink {
  // ... existing fields ...
  webhookUrl    String?
  webhookSecret String?   // merchant-generated secret for HMAC verification
}
```

**Files to touch:**

- `prisma/schema.prisma` — add two nullable fields above
- `app/api/create-link/route.ts` — accept `webhookUrl` and `webhookSecret` in body
- `lib/services/payment-link.service.ts` — persist them
- `lib/services/payment-submit.service.ts` — after `publishDashboardPaymentPaid`, fire webhook
- `components/dashboard/create-link-dialog.tsx` — add optional "Webhook URL" + "Secret" inputs
- `components/dashboard/link-row.tsx` — show webhook URL (truncated) in row if set

**What to build:**

1. Schema migration (two nullable String fields on PaymentLink).
2. In `payment-submit.service.ts`, after confirming payment is recorded, fire a background
   `fetch` POST (don't await — fire-and-forget, log failure):
   ```ts
   // payload
   {
     linkId, txSignature, inputToken, inputAmount, outputAmount, userWallet, timestamp
   }
   // header: X-Settlix-Signature: sha256=<HMAC-SHA256(secret, JSON.stringify(payload))>
   ```
3. Use Node's built-in `crypto.createHmac('sha256', secret)` — no extra deps.
4. In `CreateLinkDialog`, add a collapsible "Developer" section (same collapse pattern as Details)
   with webhook URL input and an optional secret input with a "Generate" button.
5. In the dashboard link row, show a small webhook icon if `webhookUrl` is set.

**Not needed yet:** delivery retries, delivery log table, webhook test button. Ship the basics first.

---

### 2. Link Controls — Expiry + Max Uses

**Why:** Enables entirely new use cases with a tiny schema change. Limited-seat ticket sales,
time-limited flash offers, one-time invoice links, beta access gates. Nobody in the Solana
payment space has this built natively. It also makes Settlix more trustworthy — merchants can
create a link knowing it can't be reused forever.

**Schema changes** (`prisma/schema.prisma`):

```prisma
model PaymentLink {
  // ... existing fields ...
  expiresAt  DateTime?
  maxUses    Int?       // null = unlimited
}
```

`usesCount` does NOT need a new field — derive it from `executions` count where status = 'paid'.

**Files to touch:**

- `prisma/schema.prisma` — add two nullable fields
- `app/api/create-link/route.ts` — accept and validate `expiresAt` and `maxUses`
- `lib/services/payment-link.service.ts` — persist them
- `app/api/links/[id]/route.ts` — enforce expiry and max uses when loading pay page
- `app/(pay)/pay/[id]/page.tsx` — show "This link has expired" or "Sold out" state
- `components/dashboard/create-link-dialog.tsx` — optional expiry date picker + max uses input
- `components/dashboard/link-row.tsx` — show expiry badge or uses remaining

**What to build:**

1. Schema migration.
2. In `link/[id]/route.ts`, after fetching the link, check:
   - `link.expiresAt && link.expiresAt < new Date()` → return 410 Gone
   - `link.maxUses && link._count.executions >= link.maxUses` → return 410 Gone
     (Add `_count: { select: { executions: true } }` to the Prisma query.)
3. In `pay/[id]/page.tsx`, handle the 410 response with a clear "link expired / sold out" UI.
4. In `CreateLinkDialog`, add a "Limits" collapsible section with:
   - Date/time picker for expiry (use a plain `<input type="datetime-local">`)
   - Number input for max uses (min: 1)
5. In the dashboard link row, show remaining uses as `3/10 uses` if maxUses is set, and a
   red "Expired" badge if past expiresAt.

---

### 3. Embeddable Checkout Widget (JS Snippet)

**Why:** Currently paying requires navigating to `settlix.itssvk.dev/pay/[id]`. An embed lets merchants
drop Settlix checkout into their own site with one script tag — like Stripe Checkout. This is the
single biggest distribution unlock. Buyers never leave the merchant's site. Conversion improves.
No Solana-native non-custodial checkout has this. This makes Settlix viable for any website,
not just people who know how to share a link.

**No schema changes needed.**

**New files:**

- `public/checkout.js` — the embeddable script (vanilla JS, no framework dependency)
- `app/(pay)/embed/[id]/page.tsx` — a stripped-down pay page (no navbar, transparent bg, iframe-safe)
- `app/api/embed/[id]/route.ts` — CORS-permissive endpoint that returns link metadata for the widget

**Files to touch:**

- `app/(pay)/pay/[id]/page.tsx` — extract the pay card into a shared component usable by embed page

**What to build:**

1. Create `app/(pay)/embed/[id]/page.tsx` — same pay card as `/pay/[id]` but:
   - No navbar, no outer padding, transparent background
   - Adds `X-Frame-Options: SAMEORIGIN` removed (allow iframe embedding)
   - Posts a `postMessage` to parent on payment success: `{ type: 'settlix:paid', txSignature }`
2. `public/checkout.js` — ~80 lines of vanilla JS:
   ```js
   window.Settlix = {
     open({ linkId, onSuccess, onClose }) {
       // creates a full-screen overlay div
       // appends an <iframe src="https://settlix.itssvk.dev/embed/{linkId}">
       // listens for postMessage 'settlix:paid' → calls onSuccess(txSig), removes overlay
     },
   }
   ```
3. Merchant usage:
   ```html
   <script src="https://settlix.itssvk.dev/checkout.js"></script>
   <button onclick="Settlix.open({ linkId: 'abc123' })">Pay with Settlix</button>
   ```
4. In the dashboard, add a "Embed" button on each link row that shows a copy-paste snippet.

---

## Tier 2 — Build for B2B depth

---

### 4. API Key System (Headless Access)

**Why:** Right now every API call requires a session cookie (wallet auth). No programmatic
access. An API key system lets merchants integrate Settlix into their own backend — create links
automatically, poll payment status, receive webhooks — without opening a browser. This turns
Settlix into infrastructure other apps build on. SpherePay is API-only; Helio is UI-only.
Settlix can be both.

**Schema changes** (`prisma/schema.prisma`):

```prisma
model ApiKey {
  id            String   @id @default(cuid())
  merchantWallet String
  keyHash       String   @unique   // store SHA-256 hash, never the raw key
  name          String             // human label, e.g. "My Shopify store"
  lastUsedAt    DateTime?
  createdAt     DateTime @default(now())

  @@index([merchantWallet])
}
```

**Files to touch:**

- `prisma/schema.prisma` — add ApiKey model
- `lib/auth/require-auth.ts` — extend to accept `Authorization: Bearer <key>` header alongside cookie
- `app/api/keys/route.ts` — new: list + create keys (wallet-session auth only)
- `app/api/keys/[id]/route.ts` — new: delete/revoke key
- `components/dashboard/*` — new "API Keys" section in dashboard

**What to build:**

1. Schema migration.
2. Key generation: on creation, generate a `sk_live_<32 random bytes as hex>` string, hash it with
   SHA-256, store the hash, return the raw key ONCE (never stored, never retrievable again).
3. Extend `require-auth.ts` to check `Authorization: Bearer sk_live_...` header: hash the incoming
   key, look up in `ApiKey` table, set `req.merchantWallet` from the matched record.
4. Dashboard "API Keys" tab: list existing keys (name + last used + created), "New Key" button,
   one-time reveal modal on creation, revoke button.
5. API docs snippet shown in dashboard: example `curl` call to create a link with `Authorization: Bearer`.

---

### 5. Invoice Object

**Why:** A generic payment link is fine for e-commerce. Freelancers and agencies need something
that looks like an invoice — line items, due date, client name, memo. This is the use case for
the 8,000+ merchants displaced by Coinbase Commerce exiting non-US markets. A proper invoice
page builds trust and professionalism that a bare pay card doesn't. None of your competitors
have an invoice-first flow on Solana.

**Schema changes** (`prisma/schema.prisma`):

```prisma
model Invoice {
  id             String         @id @default(cuid())
  merchantWallet String
  clientName     String?
  clientEmail    String?
  dueDate        DateTime?
  memo           String?        @db.Text
  token          String         // settlement token mint
  lineItems      InvoiceItem[]
  execution      PaymentExecution? @relation(fields: [executionId], references: [id])
  executionId    String?        @unique
  createdAt      DateTime       @default(now())
}

model InvoiceItem {
  id          String   @id @default(cuid())
  invoiceId   String
  description String
  quantity    Decimal  @db.Decimal(10, 4)
  unitPrice   Decimal  @db.Decimal(20, 6)
  invoice     Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@index([invoiceId])
}
```

Total amount is computed from line items (`SUM(quantity * unitPrice)`), not stored separately.

**New routes:**

- `app/api/invoice/route.ts` — create invoice
- `app/api/invoice/[id]/route.ts` — get invoice
- `app/(pay)/invoice/[id]/page.tsx` — invoice pay page (different layout than pay card)

**What to build:**

1. Schema migration.
2. Invoice page (`/invoice/[id]`) renders: merchant wallet (shortened), client name, due date,
   line items table, total, "Pay Invoice" button that opens the Jupiter swap flow. If already paid,
   shows a "Paid" stamp with tx link.
3. Dashboard "Create Invoice" button — form with client name, optional email, due date, memo,
   and a dynamic line-items table (add/remove rows, each with description + qty + unit price).
   Live total updates as you type.
4. Revenue split works the same way — Invoice can optionally have recipients (reuse the existing
   split logic, just point at the Invoice's computed total instead of a PaymentLink amount).
5. Dashboard invoice list — separate tab or section from payment links. Shows status: Draft /
   Unpaid / Paid / Overdue (past dueDate and unpaid).

---

### 6. On-Chain Recurring / Subscription Payments

**Why:** The biggest unsolved problem in Solana payments. SpherePay announced it but hasn't
shipped a clean consumer-facing product. Streamflow does token streaming (continuous drip), not
invoice-style recurring billing. True subscription billing — authorize once, pull monthly — would
make Settlix uniquely powerful combined with your existing revenue split (subscribers
automatically split across collaborators every cycle). This is a long-term moat feature.

**Complexity:** Requires a Solana program. The existing `program/` directory is a starting point.

**Schema changes** (`prisma/schema.prisma`):

```prisma
model SubscriptionPlan {
  id             String         @id @default(cuid())
  merchantWallet String
  token          String
  amount         Decimal        @db.Decimal(20, 6)
  intervalDays   Int            // e.g. 30 for monthly
  title          String?
  recipients     SplitRecipient[] // reuse existing model (add planId field)
  subscriptions  Subscription[]
  createdAt      DateTime       @default(now())
}

model Subscription {
  id           String             @id @default(cuid())
  planId       String
  userWallet   String
  active       Boolean            @default(true)
  nextChargeAt DateTime
  plan         SubscriptionPlan   @relation(fields: [planId], references: [id])
  executions   PaymentExecution[] // link charges back to existing execution model
  createdAt    DateTime           @default(now())

  @@index([nextChargeAt, active])
}
```

**On-chain design (Solana program):**

- Subscriber signs a `Delegate` instruction once, granting the Settlix program authority to pull
  up to `amount` per `intervalDays` from their token account.
- A server-side crank job queries `Subscription` where `nextChargeAt <= now() AND active = true`,
  builds and submits the pull transaction, records in `PaymentExecution`, advances `nextChargeAt`.
- Non-custodial: the subscriber can revoke the delegation at any time from their wallet.

**What to build (phased):**

1. Phase 1 (off-chain MVP): subscriber wallet signs a message authorizing the plan. Store
   authorization. Crank sends a transaction request to subscriber wallet each cycle via email/wallet
   notification — subscriber signs manually. Proves the concept without a program.
2. Phase 2 (on-chain): write the Solana program for delegated pull authority. Subscriber signs
   once, crank submits automatically each cycle.

---

## Tier 3 — Polish and trust builders

---

### 7. Open / Variable Amount Links

**Status: Not started.** Schema has `type String @default("fixed")` but `amount` is non-nullable.

**What to build:**

- Make `amount` nullable in schema + migrate
- In `CreateLinkDialog`, toggle between Fixed and Open — hides amount input when Open
- On pay page, if `link.type === "open"`, show a buyer-facing amount input
- Pass buyer-entered amount into Jupiter quote flow
- Validation: enforce min amount (e.g. $0.01) on the pay page

---

### 8. Protocol Fee (0.1% on Jupiter Swaps)

**Status: Not started.** Jupiter supports `platformFeeBps` natively — this is free revenue.

**What to build:**

- Add `PROTOCOL_FEE_BPS = 10` to `lib/solana/constants.ts`
- Add `NEXT_PUBLIC_PROTOCOL_FEE_WALLET` env var
- Pass `platformFeeBps` and `feeAccount` to `buildOrderUrl` in `lib/solana/jupiter.ts`
- Show "0.1% network fee" in small text on pay page
- Direct USDC transfers (no swap) are fee-free — exclude them

---

### 9. Payment Analytics

**Status: Not started.** SSE infrastructure is already in place.

**What to build:**

- Time-series chart on the dashboard: daily payment volume (USDC) for last 30 days
- Link conversion rate: track page views in a new `LinkView` table, show views → paid %
- Token breakdown: pie/bar chart of what tokens buyers paid with (from `inputToken` field)
- API route: `GET /api/dashboard/analytics?range=30d` aggregating from `PaymentExecution`

---

### 10. Public Receipt Page

**Status: Not started.**

**What to build:**

- New route: `app/(pay)/receipt/[txSignature]/page.tsx`
- Fetches `PaymentExecution` by `txSignature`, renders: merchant name (wallet shortened),
  amount, token paid, date, Solscan link
- Add a "View Receipt" link to `SuccessOverlay` after payment
- Shareable — payer can send this URL as proof of payment

---

### 11. Payer Memo / Message

**Status: Not started.**

**What to build:**

- Add `payerMemo String?` to `PaymentExecution` schema
- On pay page, show an optional "Add a note" textarea below the pay card
- Store memo in the execution record on payment submit
- Show memo in dashboard link-row execution detail view
- Useful for custom orders, freelancer context, split payment attribution

---

## Build Order

| #   | Feature                       | Status      | Effort | Market Signal                        |
| --- | ----------------------------- | ----------- | ------ | ------------------------------------ |
| ✅  | SSE real-time notifications   | Done        | —      | —                                    |
| ✅  | QR code (dashboard + Phantom) | Done        | —      | —                                    |
| ✅  | Pay with any token (Jupiter)  | Done        | —      | —                                    |
| ✅  | Swap receipt overlay          | Done        | —      | —                                    |
| ✅  | Explorer deep links           | Done        | —      | —                                    |
| ✅  | Revenue split + distribution  | Done        | —      | —                                    |
| ✅  | Title + description on links  | Done        | —      | —                                    |
| 1   | Webhooks                      | Not started | Medium | B2B infrastructure, unique on Solana |
| 2   | Link expiry + max uses        | Not started | Low    | E-commerce, ticketing, invoicing     |
| 3   | Embeddable checkout widget    | Not started | Medium | Distribution unlock, any website     |
| 4   | API key system                | Not started | Medium | Headless B2B, programmatic access    |
| 5   | Invoice object                | Not started | High   | Freelancers, Coinbase Commerce exits |
| 6   | Recurring / subscriptions     | Not started | High   | Biggest gap in Solana payments       |
| 7   | Open amount links             | Not started | Low    | Tips, donations, flexible pricing    |
| 8   | Protocol fee (0.1%)           | Not started | Low    | Revenue, free via Jupiter            |
| 9   | Payment analytics             | Not started | Medium | Merchant retention                   |
| 10  | Public receipt page           | Not started | Low    | Trust, shareability                  |
| 11  | Payer memo                    | Not started | Low    | Custom orders, attribution           |
