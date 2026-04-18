# SettleX — Hackathon Improvement Backlog

A prioritized list of features to build, updated with Colosseum Copilot data (5,400+ hackathon projects analyzed).

**Context:** 200+ projects in your cluster have been built before (Jpay, ChainPay, etc.) — none of them won. The ones that *did* win (Decal $20k, LocalPay $15k, SP3ND $5k) each had a sharp real-world angle. Your Jupiter multi-token swap is a genuine differentiator none of the winners used — but it's currently invisible to judges and buyers. The items below are ordered to fix that first.

---

## Tier 1 — Demo Killers

### ✅ 1. Real-time Payment Notifications (SSE)

**Status: Done and reviewed.**

Stream registry (`lib/realtime/dashboard-stream.ts`), SSE route (`/api/dashboard/stream`), and `useDashboard` hook are all correctly wired. Heartbeat keepalive every 20s, dedup via `seenPaidExecutionIds` ref, toast fires on `payment_paid` event with formatted amount.

---

### ✅ 2. QR Code on Every Payment Link

**Status: Done — two separate QR flows.**

- **Dashboard QR** (`components/dashboard/qr-modal.tsx` + `link-row.tsx`): Each link row has a QR button that opens a modal with the pay-page URL, Download PNG, and Copy URL. Solid.
- **Phantom QR on pay page** (`components/pay/phantom-qr-modal.tsx`): Implements the full Solana Pay Transaction Request protocol. Buyer selects token, clicks "Pay with Phantom QR", modal shows a `solana:` URL with `inputMint` and `sessionId` encoded in the path. Phantom scans → POSTs buyer wallet → server builds Jupiter swap tx → Phantom signs and broadcasts → background watcher detects on-chain confirmation → records in DB → fires SSE to merchant dashboard.

**One small thing to watch:** The dashboard QR (`qr-modal.tsx`) currently shows the HTTPS pay-page URL (for scanning with any browser/wallet). The Phantom QR on the pay page is the native Transaction Request flow. These are two different things serving different purposes — both are correct and intentional.

---

### ✅ 3. "Pay With Any Token" — Make Jupiter Visible

**Status: Done and well done.**

- `JupiterCallout` component renders above the pay card with rotating token showcase (12 random tokens cycling at 3.5s), "Pay with any asset → Settled instantly in USDC", and Jupiter attribution.
- `QuoteDisplay` shows the live "You pay X [TOKEN] → They receive Y USDC" row with Jupiter swap attribution, refresh countdown, and direct-transfer detection.
- Token selector dropdown is in place.

This is your visible moat. It's working.

---

### ✅ 4. Swap Receipt on the Confirmation Page

**Status: Done.**

`SuccessOverlay` now renders a full receipt card for the web-wallet flow:
- "You paid: X TOKEN" (raw integer formatted via `formatInput`)
- "Merchant received: Y USDC"
- "Rate: 1 TOKEN = Z USDC" with Jupiter logo (hidden for direct USDC transfers)
- Solscan link with correct `?cluster=devnet` suffix on devnet

`PayButton.onSuccess` now passes `(txSignature, { inputAmount, inputDecimals, inputSymbol })`. The Phantom QR flow calls `onSuccess(sig)` with no swap data — `SuccessOverlay` degrades gracefully (no receipt card shown).

---

## Tier 2 — Product Depth

### ❌ 5. Open / Variable Amount Links

**Status: Not started.**

The Prisma schema has `type String @default("fixed")` — the field exists, the groundwork is there. `amount` is currently non-nullable (`Decimal @db.Decimal(20,6)`), so it needs a schema migration.

**What to build:**

- Make `amount` nullable in the Prisma schema + migrate
- Update `createLinkBody` validation to accept `type: "open"` with no required `amount`
- In `CreateLinkDialog`, toggle between "Fixed" and "Open" — hides the amount input when open
- On the pay page, if `link.type === "open"`, show a buyer-facing amount input field
- Pass buyer-entered amount into the Jupiter quote flow

---

### ❌ 6. Customizable Pay Page (Merchant Branding)

**Status: Not started.**

No `title` or `description` fields exist on `PaymentLink` in the schema.

**What to build:**

- Add `title String?` (max 80 chars) and `description String?` (max 300 chars) to `PaymentLink` + migrate
- Update `createLinkBody` and `insertPaymentLink` to accept them
- Add optional inputs to `CreateLinkDialog`
- Render `title` and `description` on the pay page above the card
- Use `title` in `generateMetadata` in `pay/[id]/page.tsx` so WhatsApp/Twitter link previews are meaningful

---

## Tier 3 — Credibility Signals

### ❌ 7. Protocol Fee (0.1% on Swaps)

**Status: Not started.**

No `PROTOCOL_FEE_BPS` constant exists. Jupiter's `buildOrderUrl` in `lib/solana/jupiter.ts` doesn't pass `platformFeeBps`.

**What to build:**

- Add `PROTOCOL_FEE_BPS = 10` (= 0.1%) to `lib/solana/constants.ts`
- Add a `NEXT_PUBLIC_PROTOCOL_FEE_WALLET` env var for the fee recipient public key
- Pass `platformFeeBps` in `buildOrderUrl` in `lib/solana/jupiter.ts`
- Show "0.1% network fee" in small text on the pay page

---

### ✅ 8. Solana Explorer Deep Links

**Status: Done.**

All three missing pieces are now in `link-row.tsx`:
- `SOLSCAN_CLUSTER` constant added — `?cluster=devnet` appended on devnet, empty string on mainnet
- Wallet addresses are now `<a href="https://solscan.io/account/{wallet}{SOLSCAN_CLUSTER}">` links
- Tx signatures show as `Ab3x…9Qr ↗` (truncated text + ExternalLink icon) linking to Solscan with cluster suffix

`SuccessOverlay` already had the cluster suffix via its own `SOLSCAN_CLUSTER` constant.

---

### ❌ 9. Webhook / Email Notification on Payment

**Status: Not started.**

No `webhookUrl` field on `PaymentLink` schema. No webhook firing in the submit-tx flow.

**What to build:**

- Add `webhookUrl String?` and `webhookSecret String?` to `PaymentLink` + migrate
- In `CreateLinkDialog`, add optional "Webhook URL" input
- After `publishDashboardPaymentPaid` fires in `payment-submit.service.ts`, fire a background `fetch` POST to the webhook URL with `{ linkId, txSignature, inputToken, inputAmount, outputAmount, status, timestamp }`
- Sign the payload with HMAC-SHA256 using `webhookSecret`, send as `X-SettleX-Signature` header
- Show last delivery status in the dashboard

---

## Build Order

| #   | Feature                            | Status       | Effort  | Demo Impact | Next action |
| --- | ---------------------------------- | ------------ | ------- | ----------- | ----------- |
| ✅  | Real-time notifications (SSE)      | Done         | —       | Highest     | —           |
| ✅  | QR code (dashboard + Phantom)      | Done         | —       | High        | —           |
| ✅  | "Pay with any token" UI            | Done         | —       | Highest     | —           |
| ✅  | Swap receipt on confirmation       | Done         | —       | High        | —           |
| ✅  | Explorer deep links                | Done         | —       | Medium      | —           |
| ❌  | Pay page customization             | Not started  | Low     | High        | Schema migration + CreateLinkDialog fields |
| ❌  | Open amount links                  | Not started  | Medium  | High        | Schema migration + pay page input |
| ❌  | Protocol fee                       | Not started  | Low     | Medium      | constants.ts + jupiter.ts platformFeeBps |
| ❌  | Webhook notifications              | Not started  | High    | Medium      | Schema migration + submit-tx hook |
