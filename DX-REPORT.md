# Jupiter Developer Platform — DX Report

**Project:** Settlix — Non-custodial payment infrastructure on Solana  
**Builder:** Shouvik Mohanta  
**Developer Platform email:** connectshouvik@gmail.com  
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

So if a browser tab closes after signing but before calling back — the payment is on-chain, the record is already written. Nothing lost.

---

## Onboarding

**My entry point: Jupiter AI chat, not the docs.**

When I landed on [developers.jup.ag](https://developers.jup.ag), I opened the Jupiter AI chat immediately. I knew what I needed to build — a payment flow where the merchant receives exact USDC and the payer pays in any token — and I described the problem in plain language rather than hunting through parameter tables. That decision made the entire onboarding smooth.

The Jupiter AI chat understood the use case immediately. It wasn't a keyword search returning doc snippets — it was an actual dialogue. I'd describe the problem, get a concrete answer, and follow up. When I explained the merchant-receives-exact-amount requirement, it confirmed `swapMode=ExactOut` was the right primitive immediately, explained why ExactIn wouldn't work for a payment product, and pointed me to the current API endpoints. It also pointed me away from deprecated patterns before I had a chance to use them — told me directly what the current recommended routes were.

One specific example where the AI was decisive: `swapMode=ExactOut` is not supported across all liquidity routes. This is not obvious from reading the parameter table. Jupiter AI explained this constraint in context — certain routes only support ExactIn — which directly shaped how I handled token pair fallbacks in the implementation. I would have hit this at runtime without it.

API key flow is clean — live immediately, no email verification, no approval wait. The playground at [developers.jup.ag/docs/api-reference/swap/order?playground=open](https://developers.jup.ag/docs/api-reference/swap/order?playground=open) let me test `/order` in the browser before writing a line of code.

### The docs say `swapMode=ExactOut` isn't supported — but it is

Worth calling this out clearly because it's not a minor doc gap.

The `/order` parameter table at [developers.jup.ag/docs/api-reference/swap/order](https://developers.jup.ag/docs/api-reference/swap/order) says, verbatim: _"Swap mode. Currently only `ExactIn` is supported."_

Settlix runs on ExactOut. It's live on mainnet, processing real payments. The Jupiter AI chat told me to use ExactOut — I described my use case, it told me that's the right mode, I built on it. That guidance was correct. But the written docs tell anyone who reads them that ExactOut doesn't exist.

If I hadn't opened the chat first, I'd have read that one line, assumed ExactOut wasn't an option, and built something completely different. Any builder coming in through the docs — not the AI — would do the same. The entire payment processor use case on Jupiter depends on ExactOut. It needs to be in the docs.

---

## API Pain Points

### 1. When `/order` fails to build a transaction, the response shape is unclear

**Docs page:** [developers.jup.ag/docs/api-reference/swap/order](https://developers.jup.ag/docs/api-reference/swap/order)

The docs describe three states for the `transaction` field: null when no `taker` is provided, an empty string when the transaction build fails, and a base64 string on success. In practice — when I hit a low-liquidity meme token that couldn't be routed — the field came back falsy, and there was no `errorCode` to make it obvious what had failed.

My code at the time assumed `transaction` was always a string:

```ts
const response = await fetch('/order?...')
const data = await response.json()
const txBytes = Buffer.from(data.transaction, 'base64') // TypeError on empty/null
```

The error surfaced as a cryptic `TypeError: The "string" argument must be of type string` — nothing pointing to Jupiter. Took ~25 minutes to trace.

The fix I landed on is a simple truthiness check before deserializing. What would help is a clearer doc example showing what the response looks like specifically when no route is available — right now the failure states are described but not shown.

### 2. Two error fields, one of which is buried as "backwards compat"

**Docs page:** [developers.jup.ag/docs/api-reference/swap/order](https://developers.jup.ag/docs/api-reference/swap/order)

The docs do say that `error` is a duplicate of `errorMessage` kept for backwards compatibility — so technically it's documented. But you have to read the schema closely to find that. In practice I hit responses with both fields present and different values, and didn't have the context to know which to trust.

My production code ended up as:

```ts
errorMsg = parsed.error || parsed.errorMessage || rawText.slice(0, 500)
```

If `error` is the legacy field and `errorMessage` is the canonical one, just say so prominently in the error handling section — not buried in a schema footnote. Most builders will write defensive code like the above and move on; a clear "use errorMessage, error is legacy" note would clean that up.

### 3. Same-mint swap silently fails with a routing error

**Docs page:** [developers.jup.ag/docs/api-reference/swap/order](https://developers.jup.ag/docs/api-reference/swap/order)

If `inputMint === outputMint` (USDC → USDC), Jupiter returns a routing error — not a validation error, not a clear message. "Paying with USDC" is the most common case for a USDC-priced payment product.

The correct solution is to bypass Jupiter entirely and issue a direct SPL `transferChecked`. That's also the right solution from a gas perspective. But there is nothing in the docs that tells you to do this.

I discovered the required workaround through community research, not from Jupiter's own documentation. The fix took 20 minutes once I knew what to do; finding that it was the right fix took 2 hours.

A single callout on the `/order` docs would fix this: _"Same-mint pairs are not routed through Jupiter. If `inputMint === outputMint`, build a direct SPL transfer instead."_ This affects every merchant integration.

### 4. The `receiver` parameter is not explained in context

**Docs page:** [developers.jup.ag/docs/api-reference/swap/order](https://developers.jup.ag/docs/api-reference/swap/order)

The `receiver` query parameter — which routes the output token to a different wallet than the taker — is listed in the parameter table but has no usage example and no narrative explanation of when it applies.

For a payment processor, the split is:

```
taker    = payer's wallet (who signs and pays gas)
receiver = merchant's wallet (who receives the settled USDC)
```

This is the core ExactOut pattern for any payment product. I found it by reading every parameter in the table — most people won't do that. It should be the worked example, not a table row.

### 5. `lastValidBlockHeight` is in the response but not explained

**Docs page:** [developers.jup.ag/docs/api-reference/swap/order](https://developers.jup.ag/docs/api-reference/swap/order)

The `/order` response includes a `lastValidBlockHeight` field. The `/execute` endpoint also accepts it as an optional parameter. So the expiry information is technically there — but the docs don't explain what to do with it. If you're Solana-native you can infer it. If you're not, it's just a number in the response you don't know how to interpret.

I hit "blockhash not found" failures on-chain during development and ended up refreshing quotes every 10 seconds in production — arrived at by trial and error. A note like _"use lastValidBlockHeight from the /order response to determine when the transaction expires and pass it to /execute for nonce validation"_ would make this field actionable instead of opaque.

### 6. 429 responses have no `Retry-After` header

When I hit rate limits, the 429 response came back with no `Retry-After` header and no JSON body explaining when to retry. The rate limit thresholds aren't documented either. My current handling just throws an error and shows the user a message — there's no retry logic because I have no idea what the right backoff window is.

`Retry-After: 2` in the response header would fix this completely. One line.

---

## Developer Platform: API Keys and Analytics

**API key management** ([developers.jup.ag/dashboard](https://developers.jup.ag/dashboard)) — the UX is clean. Create key, copy, done. What's missing: there's no way to set a key scope (e.g. "this key can only call `/order` and `/execute`"). For production apps with multiple services, scoped keys are standard security practice. Right now it's all-or-nothing.

**Analytics dashboard** — I could see request counts and basic latency, which was useful for spotting the rate limit ceiling. What I couldn't see: per-endpoint breakdowns, error rate by endpoint, or a breakdown of ExactOut vs ExactIn traffic. For debugging production issues, I want to see "X% of `/order` calls returned `transaction: null` in the last hour." The current analytics are top-level only.

---

## AI Stack Feedback

The only AI tool I used was the **Jupiter AI chat on developers.jup.ag**. I'm writing about it specifically because it genuinely changed how I integrated — not as a nice-to-have, but as the thing I reached for instead of the docs.

The docs tell you what a parameter does. The chat tells you whether it's actually the right thing to use for what you're building. Those are different questions, and the second one is the one that matters when you're mid-build.

The clearest example — and this one is worth flagging separately: the written docs for `/order` say *"Swap mode. Currently only ExactIn is supported."* ExactOut isn't listed as an option. I asked the chat about my use case — merchant receives exact USDC, payer pays in any token — and it told me directly: use ExactOut, it works, it's the right mode for this. ExactIn is for swap UIs where the user controls what they put in; ExactOut is for when the receiver's amount has to be exact.

That guidance was correct. Settlix runs on ExactOut, live on mainnet. But any builder who reads the docs instead of asking the chat would conclude ExactOut doesn't exist and build something else. The chat knew something the docs didn't say.

A few other places where it saved me real time:

I wasn't sure what `receiver` was for — whether it was meant for third-party flows where payer and recipient are different wallets, or only for self-custody. Described the taker/receiver split I needed, got confirmation immediately and an explanation of what happens without it (output routes to the taker). The docs list the parameter; the chat explained when you'd actually use it.

I also asked directly what happens when `inputMint === outputMint`. The chat told me: same-mint pairs aren't routed through Jupiter, build a direct SPL transfer instead. I would have hit that at runtime otherwise and spent real time debugging.

The thing I'd change: the chat doesn't generate code. I'd describe a scenario, get a clear answer about what to do, and then write the implementation myself. If it offered a minimal working snippet alongside the explanation it would close the loop faster. Right now there's still a translation step from "I understand what to do" to "I have working code."

Session memory would also help. On a multi-day integration I had to re-explain my use case from scratch each time I opened a new session. Not a dealbreaker, but it adds friction.


---

## How I'd Rebuild developers.jup.ag

The docs are solid for someone who already knows what they want to build. The gap is the path from zero to first working integration — it's slower than it needs to be. Things I'd change, in order of impact:

### 1. Reframe the landing page around use cases, not endpoints

Current nav: list of API names. How builders think: "I want to build X." Add a use-case layer:

- "Accept payment in any token → Swap V2 ExactOut"
- "Let users swap tokens → Swap V2 ExactIn"
- "Automated DCA strategy → Recurring API"
- "Set limit orders → Trigger API"

Each use case links to a minimal working example, not a parameter table.

### 2. Code examples above the fold on every endpoint page

The first thing developers do is copy a request and modify it. Right now, examples are either at the bottom of the page or absent. Flip it: code example first, parameter reference second. A working `curl` command with real values (not `<YOUR_TOKEN>` placeholders) is worth more than three paragraphs of prose.

### 3. `/order` errors need the same treatment as `/execute` errors

The `/execute` endpoint documents its error codes — -1 through -3, -1000 through -1004. That's useful. `/order` errors are not documented the same way. When a swap fails at the order stage, you get a response body to decode and no reference for what the error codes mean or when they appear.

The same treatment — a table of error states, what triggers them, and what to do — would help a lot for the order stage specifically.

### 4. Publish latency SLAs

P50/P99 latency figures for `/order` and `/execute` are not documented anywhere. For a payment product, this is a product decision: how long do I show a loading spinner? I measured it empirically in production (~400ms P50 for `/order`, ~2-3s for `/execute` to confirm). That's good! Publish it. Fast infrastructure is a selling point, and it should be on the page.

---

## What I Wish Existed

**A server-to-server webhook on `/execute` completion.**  
My flow is: client signs → client calls my `/execute` endpoint → my server calls Jupiter → records the payment. The weak link is the browser: if the tab closes between signing and calling my endpoint, the swap lands on-chain but my database never sees it. A webhook from Jupiter directly to my server when a transaction confirms would cut the browser out of the loop entirely. Standard pattern — event type, payload, HMAC signature. For anyone building a payment product this would be huge.

**Combined ExactOut quote + USD pricing in a single call.**  
I want to show the payer "you'll pay approximately 0.87 SOL ($120.60)" before they connect their wallet. Right now I need two calls: `/order` for the swap rate, then the Price API for the USD value of the input token. These are always requested together in a payment UI. An `includeUsdPricing=true` param on `/order` would save a round trip on every quote refresh.

**Testnet/mock mode for CI.**  
Integration testing a payment flow requires real token balances on mainnet or devnet. There's no deterministic mock that returns stable responses for known mint pairs. A `?mock=true` query param (or a sandbox base URL) that returns fixed responses would make automated testing tractable.

**A first-party TypeScript package for Swap V2.**  
I didn't find one — so I wrote my own typed wrapper around the REST API. It's around 100 lines: a fetch helper, typed interfaces for `/order` and `/execute` responses, and the error normalization logic. Every TypeScript builder is going to write essentially the same thing. A maintained `@jup-ag/swap-v2` with typed request/response shapes and built-in retry would save everyone that work.

---

## Summary

ExactOut works. The API is fast, reliable, and the non-custodial settlement model is genuinely well-designed — the merchant receives exact USDC directly in their wallet without Settlix ever touching the funds. That's a hard thing to build cleanly and Jupiter's implementation handles it well.

The pain points I hit were almost all documentation gaps, not API problems. The `transaction` failure states, the same-mint case, the `receiver` context, the `lastValidBlockHeight` field — these are all things a builder figures out through trial and error when they should just be in the docs. The biggest one is ExactOut itself: the docs say it's not supported, it actually is, and it's the entire reason a payment product like Settlix is possible on Jupiter.

The AI chat saved the integration. Genuinely. If I'd gone through the written docs alone I'd have given up on ExactOut in the first 20 minutes. That's a good problem for Jupiter to have — the chat is that good — but it also means builders who don't find the chat are starting with a broken map.
