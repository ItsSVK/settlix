# SettleX — Hackathon Improvement Backlog

A prioritized list of features to build, updated with Colosseum Copilot data (5,400+ hackathon projects analyzed).

**Context:** 200+ projects in your cluster have been built before (Jpay, ChainPay, etc.) — none of them won. The ones that *did* win (Decal $20k, LocalPay $15k, SP3ND $5k) each had a sharp real-world angle. Your Jupiter multi-token swap is a genuine differentiator none of the winners used — but it's currently invisible to judges and buyers. The items below are ordered to fix that first.

---

## Tier 1 — Demo Killers

### ✅ 1. Real-time Payment Notifications (SSE)

**Status: Done.**

Both browser windows update live the instant a payment lands. Toast fires: "Payment received — 10 USDC". The stream registry, SSE route, and `useDashboard` hook are all wired correctly.

---

### 2. QR Code on Every Payment Link

**Why (Colosseum-validated):** QR codes appeared in two separate $5k–$15k winning payment projects (LocalPay, Gaian). It's a 30-minute build that bridges physical-world demos and lets you scan from a phone during a live pitch.

**What to build:**

- Install `qrcode.react` (or `qrcode` for server-side)
- Add a QR code modal/popover to each row in `LinksTable` — clicking "QR" generates the QR for that link's `/pay/{id}` URL
- Also render the QR code on the pay page itself so mobile users can scan from another device
- Add a "Download QR" button that exports it as a PNG

**Demo move:** Show a QR code on screen, scan it with your phone, and complete the payment from mobile. No narration needed.

---

### 3. "Pay With Any Token" — Make Jupiter Visible

**Why (gap found via Colosseum):** This is your actual moat. Jpay, ChainPay, and every other payment project that lost required buyers to already hold the right stablecoin. You don't — the buyer pays in SOL, BONK, JTO, anything, and the merchant gets USDC. Judges won't know this unless you show it explicitly.

**What to build:**

- On the pay page, above the payment card, add a callout: *"Pay with any Solana token — your merchant always receives USDC"*
- Show a row of token icons (SOL, USDC, BONK, JTO, etc.) as chips/pills — visual shorthand for "any token"
- Add a token selector dropdown on the pay page so buyers can choose their input token (if not already present)
- The line *"You pay X SOL → Merchant receives Y USDC"* should be live-updated as the buyer types or selects a token (use the Jupiter quote)

**Demo move:** Pick BONK in the token selector. Watch the quote update live. Pay. Merchant gets USDC. No other Solana payment product does this.

---

### 4. Swap Receipt on the Confirmation Page

**Why (Decal pattern — won $20k):** After payment, buyers currently see a generic success screen. Decal won partly because they made the on-chain mechanics visible and trustworthy. A receipt that shows the swap route makes SettleX feel like real infrastructure, not a demo.

**What to build:**

- After a successful payment, render a receipt card showing:
  - *"You paid: 2.3 SOL"*
  - *"Merchant received: 47.82 USDC"*
  - Exchange rate: *"1 SOL = 20.79 USDC (via Jupiter)"*
  - Transaction: `Ab3x...9Qr ↗` linked to Solscan
- Add a "Save receipt" button (screenshot the card or download as PNG)
- Show the Jupiter logo/attribution — it signals you're using real swap infrastructure

---

## Tier 2 — Product Depth

### 5. Open / Variable Amount Links

**Why:** Your schema already has a `type` field defaulting to `"fixed"` — the groundwork is there. Adding `"open"` type doubles your addressable market: tip jars, donations, freelance invoices.

**What to build:**

- Update `createLinkBody` validation to accept `type: "open"` with no required `amount`
- Update `insertPaymentLink` service and Prisma schema to allow `amount` to be null for open links
- In `CreateLinkDialog`, add a toggle — "Fixed amount" vs "Open amount" — that hides the amount input when open is selected
- On the pay page (`pay-card.tsx`), if link type is `"open"`, render an amount input field for the buyer to fill in
- Pass the buyer-entered amount into the Jupiter quote flow

---

### 6. Customizable Pay Page (Merchant Branding)

**Why:** Right now the pay page shows amount and token. If it shows "Pay Aryan for Logo Design" with a description, it feels like a real product — not a demo. 30 minutes of work with huge UX payoff.

**What to build:**

- Add `title` (optional, max 80 chars) and `description` (optional, max 300 chars) fields to the `PaymentLink` Prisma model
- Update `createLinkBody` validation and `insertPaymentLink` service to accept these fields
- Add the fields to `CreateLinkDialog` as optional inputs
- Render `title` and `description` on the pay page above the payment card
- Update `generateMetadata` in `pay/[id]/page.tsx` to use the link title as the page `<title>` — this makes shared links look good on WhatsApp/Twitter

---

## Tier 3 — Credibility Signals

### 7. Protocol Fee (0.1% on Swaps)

**Why (Colosseum-validated):** Judges always ask "how do you make money?" Have the answer in the code, not just the pitch. Capital efficiency / revenue model was overindexed by winners in the gap analysis.

**What to build:**

- Add a `PROTOCOL_FEE_BPS` constant (e.g., `10` = 0.1%) in `lib/solana/constants.ts`
- When building the Jupiter swap quote in `lib/solana/jupiter.ts`, add the protocol wallet address as a `feeAccount` in the quote params (Jupiter supports `platformFeeBps`)
- Create a dedicated protocol fee wallet (a new Solana keypair) and store the public key in env
- Display "0.1% network fee" in small text on the pay page so buyers see it — transparency builds trust

---

### 8. Solana Explorer Deep Links

**Why:** 10 minutes of work. Every `txSignature` in your dashboard becomes a clickable link to Solscan. Makes the product feel on-chain and trustworthy to crypto-native judges.

**What to build:**

- In `link-row.tsx` and anywhere `txSignature` is displayed, wrap it in an `<a>` tag pointing to `https://solscan.io/tx/{txSignature}`
- Use `?cluster=devnet` suffix when `NEXT_PUBLIC_SOLANA_CLUSTER === "devnet"` so the link works in both environments
- Add a small external link icon next to the truncated signature (e.g., `Ab3x...9Qr ↗`)
- Apply the same treatment to wallet addresses — link them to `https://solscan.io/account/{address}`

---

### 9. Webhook / Email Notification on Payment

**Why:** This is the integration story. When a payment lands, POST the event data to the merchant's URL — suddenly SettleX plugs into Shopify, Notion, Zapier, anything.

**What to build:**

- Add a `webhookUrl` (optional) field to the `PaymentLink` Prisma model
- In `CreateLinkDialog`, add an optional "Webhook URL" input with a placeholder like `https://yoursite.com/api/settlex-webhook`
- After a payment execution is confirmed in the submit-tx flow, fire a background `fetch` POST to the webhook URL with payload: `{ linkId, txSignature, inputToken, inputAmount, outputAmount, status, timestamp }`
- Add a `webhookSecret` field so merchants can verify the payload with an HMAC header (`X-SettleX-Signature`)
- Show last webhook delivery status in the dashboard (success/failed)

---

## Build Order

| #   | Feature                            | Effort | Demo Impact | Colosseum signal              |
| --- | ---------------------------------- | ------ | ----------- | ----------------------------- |
| ✅  | Real-time notifications (SSE)      | Done   | Highest     | Core demo requirement         |
| 2   | QR code generation                 | Low    | High        | Used by 2 payment winners     |
| 3   | "Pay with any token" UI            | Low    | Highest     | Your moat — currently hidden  |
| 4   | Swap receipt on confirmation       | Low    | High        | Decal $20k winner pattern     |
| 6   | Pay page customization             | Low    | High        | Polished product feel         |
| 5   | Open amount links                  | Medium | High        | Schema already has type field |
| 7   | Protocol fee                       | Low    | Medium      | Answers "how do you make money?" |
| 8   | Explorer deep links                | Lowest | Medium      | 10 min, high credibility      |
| 9   | Webhook notifications              | High   | Medium      | Enterprise integration story  |
