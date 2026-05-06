# Jupiter Developer Platform — DX Report

**Project:** Settlix — Non-custodial payment infrastructure on Solana  
**Builder:** Shouvik Mohanta  
**Integration:** Swap V2 (`/order` ExactOut + `/execute`)  
**Stack:** Next.js 16, Prisma, `@solana/web3.js`, `@solana/spl-token`  
**Repo:** [github.com/itssvk/settlix](https://github.com/itssvk/settlix)  
**Live:** [settlix.itssvk.dev](https://settlix.itssvk.dev)

---

## What I Built

Settlix is a non-custodial payment platform for Solana merchants. The core product: merchants create payment links, invoices, and subscription plans priced in USDC — and their customers pay in _any_ Solana token they hold (SOL, BONK, JUP, whatever). The merchant always receives the exact USDC amount specified, with zero slippage risk on their side.

Jupiter's Swap V2 ExactOut is the primitive that makes this possible. The checkout flow:

1. Merchant sets price in USDC (e.g. $125.00)
2. Payer selects their token (e.g. SOL)
3. App calls `GET /order?swapMode=ExactOut&amount=125000000` — Jupiter returns the exact SOL input required plus an assembled transaction
4. Payer signs in their wallet
5. App calls `POST /execute` — Jupiter lands the transaction and settles exactly 125 USDC to the merchant's wallet

No custodial intermediary, no manual conversion, no exchange rate risk for the merchant.

**This is not a typical Jupiter integration.** Most Jupiter integrations are swap UIs: the user controls the input amount, Jupiter estimates the output, and the user accepts some price impact. Settlix inverts the model entirely. The merchant controls the output — the USDC amount they need to receive is fixed — and Jupiter's job is to compute whatever input the payer needs to supply. Jupiter becomes payment rails, not a trading interface. The payer never thinks about swapping. They pick a token, sign once, and the merchant's wallet receives the exact amount the invoice says.

---

## Before / After: How Jupiter Changed the Product

**Before Jupiter (original design):**  
The first version of Settlix required both parties to use USDC. Merchants had to tell customers "you need USDC to pay me." That kills conversion — most Solana users hold SOL, meme tokens, or whatever they accumulated. The UX was: pay page → "you need USDC" → go to a DEX → swap → come back → pay. Three extra steps that most users drop off at.

**After integrating Jupiter Swap V2 ExactOut:**  
The pay page now shows a token selector. Pick SOL, pick BONK, pick JUP. Jupiter handles the route. The merchant experience is unchanged — they still see `$125.00 received`. The payer experience went from "go swap first" to "pick your token, sign once."

This is not a minor UX improvement — it's the difference between a product that requires USDC literacy and one that works for all of Solana. Jupiter's ExactOut mode is directly responsible for making Settlix usable for non-USDC native users.

---

## Technical Implementation

### Architecture

The integration has three layers:

```
Client (browser wallet)
  └── POST /api/checkout/pay/order   ← server builds ExactOut order via Jupiter
  └── Signs transaction in wallet
  └── POST /api/checkout/pay/execute ← server calls Jupiter /execute, records payment
```

The server is the integration point for Jupiter in both directions — no Jupiter calls are made from the browser. This keeps the API key server-side and means the payment recording step is authoritative: if `/execute` returns `Success`, the DB record is written server-side in the same request, not by a separate browser callback that could be dropped.

### The ExactOut Order — with `receiver` routing funds to the merchant

The core Jupiter call. The `receiver` parameter is what makes this non-custodial: the output token routes directly to the merchant's wallet without touching Settlix infrastructure.

```ts
// lib/solana/jupiter.ts

function buildOrderUrl(
  inputMint: string,
  outputMint: string,
  exactOutRaw: string,
  taker?: string,
  receiver?: string,
): string {
  const p = new URLSearchParams({
    inputMint,
    outputMint,
    amount: exactOutRaw, // exact USDC amount merchant invoiced, in raw lamports
    swapMode: 'ExactOut',
  })
  if (taker) p.set('taker', taker) // payer's wallet — signs and pays gas
  if (receiver) p.set('receiver', receiver) // merchant's wallet — receives the USDC
  return `/order?${p.toString()}`
}

export async function getExactOutOrder(
  inputMint: string,
  outputMint: string,
  exactOutRaw: bigint,
  taker: string,
  receiver?: string,
): Promise<JupiterOrderResponse> {
  const url = buildOrderUrl(inputMint, outputMint, exactOutRaw.toString(), taker, receiver)
  const response = await jupiterFetch<JupiterOrderResponse>(url)
  if (response.error || response.errorMessage) {
    throw new Error(response.errorMessage ?? response.error ?? 'Jupiter order failed')
  }
  if (!response.transaction) {
    // Jupiter returns HTTP 200 with transaction: null when no route exists.
    // Guard here — not documented in the response schema.
    throw new Error('Jupiter returned no transaction for order')
  }
  return response
}
```

At the service layer, the merchant wallet is the `receiver` — Jupiter settles exact USDC directly there:

```ts
// lib/services/jupiter-order.service.ts

const order = await getExactOutOrder(
  body.inputMint,
  pay.token, // USDC mint
  rawOut, // exact invoice amount in raw units
  body.taker, // payer wallet (signs, pays gas)
  pay.merchant.wallet, // merchant wallet (receives USDC)
)
```

### Same-Mint Bypass — USDC → USDC

Jupiter rejects same-mint swaps. For a USDC-priced product, "pay with USDC" is the most common case. The service layer detects it and falls back to a direct SPL `transferChecked`, bypassing Jupiter entirely:

```ts
// lib/services/jupiter-order.service.ts

if (body.inputMint === pay.token) {
  // Payer is using the exact settlement token — no swap needed.
  // Jupiter rejects same-mint pairs; build a direct SPL transferChecked.
  const tx = await buildDirectSettlementPaymentTx({
    connection,
    payer: new PublicKey(body.taker),
    merchant: new PublicKey(pay.merchant.wallet),
    settlementMint: mint,
    transferAmountRaw: rawOut,
    mintDecimals,
    linkId: body.payId ?? body.invoiceId,
  })

  return {
    transaction: Buffer.from(tx.serialize()).toString('base64'),
    inAmount: rawOut.toString(),
    outAmount: rawOut.toString(),
    requestId: null, // no Jupiter requestId — goes to RPC directly
    isDirect: true, // tells the frontend to call /api/solana/send instead of /execute
  }
}
```

The `isDirect` flag propagates to the frontend, which routes the signed transaction to a plain RPC send rather than Jupiter's `/execute` endpoint.

### Subscription Renewal — Relayer-Pulled SPL Transfers

Recurring billing is the most architecturally complex part of the integration. It doesn't use Jupiter at all — subscriptions are settled in the plan's native token, so no swap is needed — but it demonstrates the depth of the on-chain work.

On subscribe, the subscriber signs a transaction that does two things: delegates a spending allowance to a server-held relayer keypair, and attaches a `settlix:sub:<planId>` memo for auditability:

```ts
// lib/solana/subscriptionTxBuilder.ts — buildSubscriptionAuthorizationTx

const delegatedAmount = totalDelegationRaw * BigInt(delegationIterations)

const instructions = [
  // Approve relayer to pull up to N billing periods without subscriber re-signing.
  createApproveCheckedInstruction(subscriberAta, settlementMint, relayer, subscriber, delegatedAmount, mintDecimals),
  new TransactionInstruction({
    programId: new PublicKey(MEMO_PROGRAM_ID),
    data: Buffer.from(`settlix:sub:${planId}`, 'utf-8'),
  }),
]
```

On each billing date, the server's cron job calls `buildRenewalTx` — the relayer signs as SPL delegate and pulls the payment without requiring any user action:

```ts
// lib/solana/subscriptionTxBuilder.ts — buildRenewalTx

const instructions = [
  createAssociatedTokenAccountIdempotentInstruction(
    relayerKeypair.publicKey, // relayer pays ATA creation if needed
    merchantAta,
    merchant,
    settlementMint,
  ),
  createTransferCheckedInstruction(
    subscriberAta,
    settlementMint,
    merchantAta,
    relayerKeypair.publicKey, // relayer signs as SPL delegate
    transferAmountRaw,
    mintDecimals,
  ),
  new TransactionInstruction({
    programId: new PublicKey(MEMO_PROGRAM_ID),
    data: Buffer.from(`settlix:renewal:${subscriptionId}`, 'utf-8'),
  }),
]

const tx = new VersionedTransaction(compiled)
tx.sign([relayerKeypair]) // subscriber does not sign renewals
```

### Payment Recording Guarantee

One architectural decision worth highlighting: payment recording happens server-side inside the `/execute` handler, not via a browser callback after the fact. After Jupiter returns `Success`, the DB write happens in the same request:

```ts
// app/api/checkout/pay/execute/route.ts

const result = await executeSwap(parsed.data.signedTransaction, parsed.data.requestId)

if (result.status === 'Success') {
  // Record immediately — if the browser tab drops after signing, the payment
  // is still recorded. No reliance on the client posting back.
  await processSubmitTx({
    txSignature: result.signature,
    inputAmount: result.inputAmountResult,
    outputAmount: result.outputAmountResult,
    ...
  })
}
```

This eliminates the class of bugs where a user's payment confirms on-chain but the merchant's dashboard never reflects it because the browser closed between signing and the confirmation callback.

---

## Onboarding

**Time from landing on [developers.jup.ag](https://developers.jup.ag) to first successful API call: ~25 minutes.**

That's fast compared to most payment APIs. API key is live immediately — no email verification loop, no approval wait, copy button works. The Swagger-style explorer at [developers.jup.ag/api](https://developers.jup.ag/api) let me test `/order` before writing a line of code, which is the right default.

**What slowed me down:**

### Wrong docs, strong SEO

Googling "Jupiter swap API" in May 2026 still surfaces the old v6 docs ([station.jup.ag/docs/apis/swap-api](https://station.jup.ag/docs/apis/swap-api)) ahead of the new Developer Platform. The old API shape uses `/quote` + `/swap` — completely different from the new `/order` + `/execute` pattern. I spent ~15 minutes reading the old docs, writing code to that shape, then realising at runtime it was deprecated.

There is no banner on the old docs page pointing to the new platform. There is no canonical redirect. The old pages are still fully accessible with no deprecation notice. This is the single biggest onboarding friction point.

**Fix:** One `<meta name="robots" content="noindex">` tag on the old docs, or a sticky top banner saying "Swap V2 is the current API — [migrate here](https://developers.jup.ag/docs/swap-api)." Takes one engineer an hour.

### `swapMode=ExactOut` is invisible

The parameter that unlocks the payment processor use case — `swapMode=ExactOut` — appears once in the parameter table at [developers.jup.ag/docs/swap-api/v2](https://developers.jup.ag/docs/swap-api/v2) with a one-line description. No example. No sample request/response. No explanation of when you'd use it vs ExactIn.

ExactOut is not a power-user feature. It's the feature anyone building for merchants needs. "I want the output to be exact, input can vary" is a natural requirement for any payment flow. It deserves its own section with a worked example, not a table row.

---

## API Pain Points

### 1. `transaction: null` returns HTTP 200 — undocumented

**Docs page:** [developers.jup.ag/docs/swap-api/v2#order](https://developers.jup.ag/docs/swap-api/v2#order)

When `/order` can't route a swap (low liquidity pair, unsupported token), it returns HTTP 200 with `"transaction": null` in the body. This is not mentioned anywhere in the response schema documentation.

I hit this testing with a low-cap meme token. My code at the time:

```ts
const response = await fetch('/order?...')
const data = await response.json()
// assumed data.transaction was always a string
const txBytes = Buffer.from(data.transaction, 'base64') // TypeError: null
```

The error surfaced as a cryptic `TypeError: The "string" argument must be of type string` — nothing pointing to Jupiter. Took ~25 minutes to trace to the null transaction.

**Required doc addition:** In the response schema for `/order`, add: _"`transaction`: Base64-encoded transaction string, or `null` if no route is available for this pair."_ And in the errors/edge cases section, add the explicit check pattern.

### 2. Error response shape has two keys with no documented precedence

**Docs page:** [developers.jup.ag/docs/swap-api/v2](https://developers.jup.ag/docs/swap-api/v2)

Error responses sometimes contain `error`, sometimes `errorMessage`, and sometimes both with different values. I never found documentation defining which field takes precedence or when each appears.

My production code ended up as:

```ts
errorMsg = parsed.error || parsed.errorMessage || rawText.slice(0, 500)
```

This is defensive noise that every Jupiter integrator will independently write. Pick one field (`error`), document it, return only that. If there's a reason for both to exist (backward compat, internal routing), document that reason. Right now it's just surprising.

### 3. Same-mint swap silently fails with a routing error

**Docs page:** [developers.jup.ag/docs/swap-api/v2#order](https://developers.jup.ag/docs/swap-api/v2#order)

If `inputMint === outputMint` (USDC → USDC), Jupiter returns a routing error — not a validation error, not a clear message. "Paying with USDC" is the most common case for a USDC-priced payment product.

The correct solution is to bypass Jupiter entirely and issue a direct SPL `transferChecked`. That's also the right solution from a gas perspective. But there is nothing in the docs that tells you to do this.

I discovered the required workaround through a GitHub issue on the old v6 repo, not from Jupiter's own documentation. The fix took 20 minutes once I knew what to do; finding that it was the right fix took 2 hours.

**Required doc addition:** A callout box on the `/order` docs: _"Same-mint pairs are not routed through Jupiter. If `inputMint === outputMint`, build a direct SPL transfer instead."_ Link to an example. This affects every merchant integration.

### 4. The `receiver` parameter is not explained in context

**Docs page:** [developers.jup.ag/docs/swap-api/v2#order](https://developers.jup.ag/docs/swap-api/v2#order)

The `receiver` query parameter — which routes the output token to a different wallet than the taker — is listed in the parameter table but has no usage example and no narrative explanation of when it applies.

For a payment processor, the split is:

```
taker    = payer's wallet (who signs and pays gas)
receiver = merchant's wallet (who receives the settled USDC)
```

This is the fundamental ExactOut pattern for third-party payments. It should be the primary example on the ExactOut section, not a row in a table. I found it by systematically reading every parameter; most builders won't.

### 5. No documented TTL for assembled transactions

**Docs page:** [developers.jup.ag/docs/swap-api/v2](https://developers.jup.ag/docs/swap-api/v2)

The transaction returned by `/order` has a blockhash expiry. Quotes go stale. I know this because transactions were occasionally failing on-chain with "blockhash not found" errors during development.

I set a 30-second client-side auto-refresh based on trial and error. I have no idea if 30 seconds is conservative, aggressive, or exactly right. The actual TTL is not documented anywhere.

Without a documented TTL, every builder independently discovers this through on-chain failures and guesses at the refresh interval. Some will refresh too often (burning API quota), some not enough (serving failed transactions to users).

**Fix:** One sentence: _"Assembled transactions use a recent blockhash and are valid for approximately X seconds. Refresh the quote if the user hasn't signed within that window."_

### 6. 429 responses have no `Retry-After` header

**Docs page:** [developers.jup.ag/docs/swap-api/rate-limits](https://developers.jup.ag/docs/swap-api/rate-limits) _(if this page exists)_

During load testing, 429 responses contained no `Retry-After` header and no JSON body with retry timing. The rate limit thresholds are not documented. I implemented exponential backoff with a 1-second base by convention.

This is a one-line fix server-side that removes all guesswork for integrators. `Retry-After: 2` in the response header is the entire solution.

---

## Developer Platform: API Keys and Analytics

**API key management** ([developers.jup.ag/dashboard](https://developers.jup.ag/dashboard)) — the UX is clean. Create key, copy, done. What's missing: there's no way to set a key scope (e.g. "this key can only call `/order` and `/execute`"). For production apps with multiple services, scoped keys are standard security practice. Right now it's all-or-nothing.

**Analytics dashboard** — I could see request counts and basic latency, which was useful for spotting the rate limit ceiling. What I couldn't see: per-endpoint breakdowns, error rate by endpoint, or a breakdown of ExactOut vs ExactIn traffic. For debugging production issues, I want to see "X% of `/order` calls returned `transaction: null` in the last hour." The current analytics are top-level only.

**No API versioning signal in the dashboard** — the dashboard doesn't show which API version my key is calling or alert when a version is deprecated. Since v6 → Swap V2 is a breaking migration, having the dashboard surface "your usage shows v6 calls — migrate by [date]" would be a useful guardrail.

---

## AI Stack Feedback

### Jupiter AI Chat — The Most Used Tool in This Integration

The single most valuable AI feature during this build was the **AI chat embedded in the Jupiter developer website**. I used it more than any other resource — more than the parameter tables, more than the Swagger explorer, more than any external tool.

Here is why: the documentation tells you _what_ each parameter does. The AI chat tells you _why_ and _when_. Those are different questions, and for a first-time integration they matter more.

The clearest example was `swapMode=ExactOut`. I had read the parameter table and understood the mechanics — output is fixed, input varies. But I had a product question underneath it: _is this actually the right primitive for a payment processor, or am I reaching?_ I described my use case to the chat — merchant sets price in USDC, payer pays in any token, merchant must receive the exact amount — and got an immediate, confident answer: yes, ExactOut is precisely the mode for this. Use ExactIn for swap UIs where the user controls input amount; use ExactOut when the receiver's amount is what must be guaranteed.

That one exchange settled a design question that could have taken hours of trial and error. I went from "I think this is right" to "I know this is right" in under two minutes.

**Other moments where the AI chat was decisive:**

- I wasn't sure whether the `receiver` parameter in `/order` was meant for third-party payment flows or only for self-custody scenarios. I described the taker/receiver split I needed (payer signs, merchant wallet gets the USDC) and got confirmation that this is exactly what `receiver` is for — with a clear explanation that without it, the output routes to the taker's wallet. The docs describe the parameter; the chat explained the mental model.

- I had a question about what happens when `inputMint === outputMint` — specifically whether Jupiter would just route through itself or return an error. The chat told me immediately: same-mint pairs are not routed, you should build a direct SPL transfer. That's the kind of edge case that would have cost me significant debugging time if I had discovered it only at runtime.

- Early in the build I was deciding whether to poll for transaction confirmation on the client or rely on Jupiter's `/execute` response. I asked the chat directly. It explained the confirmation model clearly enough that I made the right architectural call the first time.

**What the AI chat does well:**

The chat is good at translating "I want to build X, does feature Y apply here?" questions. It understands the product context, not just the API surface. For an integration like ExactOut — which has a clear intended use case but minimal narrative documentation — having a conversational layer that fills in the "why" is genuinely transformative. You can express an idea in plain language and get back a clear answer about whether you're on the right track before writing a single line of code.

**What could make it better:**

The chat doesn't surface code examples proactively. I would describe a scenario, get a clear conceptual answer, and then have to translate that answer into code myself. If the chat offered to generate a minimal working snippet alongside the explanation — or linked directly to the relevant section of the Swagger explorer — the loop from "I understand the concept" to "I have code that works" would be even shorter.

It also doesn't remember context across sessions. If I asked about ExactOut in one session and came back the next day with a follow-up, I had to re-explain my use case from scratch. Session memory would meaningfully reduce that friction for multi-day integrations.

---

### Agent Skills (Coding Agent Context)

I used Claude Code as my coding agent for writing the actual implementation. The Jupiter Agent Skills context file was useful for scaffolding — it gave the agent correct endpoint names and prevented hallucinating the old v6 shape. For writing the initial fetch wrapper and typing the response interfaces, it saved real time.

**The gap:** The ExactOut section in the skills file is thin. It describes the parameter but doesn't include the `taker`/`receiver` split, the same-mint bypass requirement, or the `transaction: null` null-guard. The Jupiter AI chat answered these questions conversationally; the skills file didn't. A coding agent working from the skills file alone will call `/order` correctly but miss the non-obvious edge cases — which is exactly what happened before I corrected it manually.

**What I'd add to the skills file to close that gap:**

```
# ExactOut payment processor pattern
# Use this when: merchant receives exact amount, payer's input varies
# Required params: inputMint, outputMint, amount (raw output), taker (payer), receiver (merchant)
# Edge cases:
#   - If inputMint === outputMint: skip Jupiter, build direct SPL transferChecked
#   - response.transaction may be null (no route available) — guard before deserializing
#   - Transaction has ~30s TTL — implement client-side refresh
```

That's ~8 lines. It would have eliminated every non-trivial debugging session in this integration. The Jupiter AI chat knew all of this; the skills file should too.

### Docs MCP

**Why I didn't use it for local development:** My coding environment can read project files directly, so the MCP added no capability I didn't already have. The Docs MCP becomes valuable in sandboxed or cloud IDE environments where filesystem access isn't available.

**Discovery problem:** I found the Docs MCP from the bounty description, not from developers.jup.ag. If it's a priority investment, it needs to be in the nav — not buried in a bounty brief. Builders who never see the bounty will never find it.

**What would make it useful even locally:** If the MCP returned live docs reflecting real-time API changes rather than a static index, there would be a reason to use it even when local file access is available. A static skills file can go stale; an always-current MCP can't. The Jupiter AI chat benefits from this framing already — if the MCP had the same live-data property, it would be a meaningfully different tool.

### Jupiter CLI

**Why I didn't use it:** The integration point for Settlix is a server-side Next.js API route, not a terminal session. A CLI tool doesn't fit that workflow. Its value is clearer for agent-native environments that want JSON-native execution without writing HTTP wrapper code.

**What would make it useful for product integrations:**

- A `--dry-run` flag that returns what the transaction _would_ do without broadcasting — useful for testing payment flows without spending real tokens
- Consistent `--output json` across all subcommands so the output can be piped into build scripts
- An `npx`-installable version for CI pipelines that can't maintain a global install

### What the AI stack is missing overall

A **testing harness skill** that tells a coding agent how to write integration tests for Jupiter calls without needing real token balances. Right now there is no documented mock or stub pattern, so agents either skip testing or produce tests that require mainnet state. The Jupiter AI chat could answer this question conversationally — but there is nothing in the skills file or docs that covers it systematically. A skills file on "how to test Jupiter integrations" would meaningfully improve code quality across the ecosystem.

---

## How I'd Rebuild developers.jup.ag

**Current state:** Strong reference documentation. Clean API key flow. Useful Swagger explorer. Optimised for people who already know what they want to build. Doesn't move a builder from zero to first working integration efficiently enough.

**Changes I'd make, ranked by impact:**

### 1. Kill the SEO problem with the old docs — highest ROI change on this list

Every builder who Googles "Jupiter swap API" lands on the deprecated v6 docs first. This is not a small issue — it means new builders start wrong, write code to the old shape, and then spend time debugging why their integration doesn't match the current platform.  
**Action:** `noindex` the old docs, or a sticky banner: _"This is the old API. Swap V2 is at [developers.jup.ag]."_

### 2. Reframe the landing page around use cases, not endpoints

Current nav: list of API names. How builders think: "I want to build X." Add a use-case layer:

- "Accept payment in any token → Swap V2 ExactOut"
- "Let users swap tokens → Swap V2 ExactIn"
- "Automated DCA strategy → Recurring API"
- "Set limit orders → Trigger API"

Each use case links to a minimal working example, not a parameter table.

### 3. Code examples above the fold on every endpoint page

The first thing developers do is copy a request and modify it. Right now, examples are either at the bottom of the page or absent. Flip it: code example first, parameter reference second. A working `curl` command with real values (not `<YOUR_TOKEN>` placeholders) is worth more than three paragraphs of prose.

### 4. Add an error code reference page

Every error state I hit required me to log the raw response and interpret it from first principles. A table of error codes, their meaning, when they occur, and the correct recovery action would be used by every integrator and would permanently reduce support load.

### 5. Publish latency SLAs

P50/P99 latency figures for `/order` and `/execute` are not documented anywhere. For a payment product, this is a product decision: how long do I show a loading spinner? I measured it empirically in production (~400ms P50 for `/order`, ~2-3s for `/execute` to confirm). That's good! Publish it. Fast infrastructure is a selling point, and it should be on the page.

---

## What I Wish Existed

**A server-to-server webhook on `/execute` completion.**  
Current flow: client signs → client calls `/execute` → client POSTs result back to my server. This means I'm trusting the client to report success. For a payment product, I want Jupiter to call my server directly when a transaction confirms. Standard webhook pattern — event type, payload, HMAC signature. Would eliminate the "trust the client" problem entirely.

**Combined ExactOut quote + USD pricing in a single call.**  
I want to show the payer "you'll pay approximately 0.87 SOL ($120.60)" before they connect their wallet. Right now I need two calls: `/order` for the swap rate, then the Price API for the USD value of the input token. These are always requested together in a payment UI. An `includeUsdPricing=true` param on `/order` would save a round trip on every quote refresh.

**Testnet/mock mode for CI.**  
Integration testing a payment flow requires real token balances on mainnet or devnet. There's no deterministic mock that returns stable responses for known mint pairs. A `?mock=true` query param (or a sandbox base URL) that returns fixed responses would make automated testing tractable.

**SDK for TypeScript.**  
I wrote my own typed wrapper around the REST API. Every builder does this independently. A first-party `@jup-ag/sdk-v2` package with typed request/response interfaces, automatic retry, and built-in error normalization would accelerate every TypeScript integration. The wrapper I built is ~100 lines; a first-party version with test coverage and maintained types would save every TS builder from doing the same.

---

## Summary

Jupiter's Swap V2 ExactOut is the right primitive for non-custodial merchant payments. The integration surface is small, the execution quality is high, and the end result — a payer paying in any token while a merchant receives exact USDC — is genuinely elegant.

The friction was almost entirely documentation gaps around edge cases that are predictable and common: `transaction: null`, same-mint bypass, error shape inconsistency, undocumented TTL, missing `Retry-After`. None of these are hard engineering problems — they're documentation problems that an afternoon of writing would fix permanently.

The platform is closer to done than most developer APIs I've worked with. The highest-leverage improvement is the SEO problem: fix the old docs ranking, and every new builder starts in the right place. Everything else is polish on a foundation that's already solid.
