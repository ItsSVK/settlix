/**
 * Demo seed — generates realistic dashboard data across all sections.
 * Safe to re-run: tears down the merchant's data first, then re-creates.
 *
 * Usage:
 *   MERCHANT_WALLET=<your_wallet> bun prisma/seed.ts
 *   (or set it in the constant below)
 */

import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import {
  PrismaClient,
  PaymentLinkType,
  SubscriptionInterval,
  SubscriptionStatus,
  RenewalStatus,
  PaymentExecutionStatus,
  PaymentExecutionSource,
} from '../lib/generated/prisma/client'

// ─── Edit this to match your wallet ──────────────────────────────────────────
const MERCHANT_WALLET = process.env.MERCHANT_WALLET ?? 'Ew71o1mNpV4PG7Z5vVLnJfqrVdnZfy2TmsQsdHjufxN3'

// ─── Well-known mints ─────────────────────────────────────────────────────────
const USDC  = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const SOL   = 'So11111111111111111111111111111111111111112'
const BONK  = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
const JUP   = 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const sig    = () => Array.from({ length: 88 }, () => B58[~~(Math.random() * 58)]).join('')
const pubkey = () => Array.from({ length: 44 }, () => B58[~~(Math.random() * 58)]).join('')
const hex64  = () => Array.from({ length: 64 }, () => '0123456789abcdef'[~~(Math.random() * 16)]).join('')
const uuid   = () => crypto.randomUUID()

/** Returns a Date between `daysAgo` and `daysAgo - spread` days before now. */
function pastDate(daysAgo: number, spreadHours = 18): Date {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(9 + ~~(Math.random() * spreadHours), ~~(Math.random() * 60), ~~(Math.random() * 60), 0)
  return d
}
function futureDate(daysFromNow: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Raw USDC units (6 decimals) for a human amount, with tiny slippage. */
function usdcRaw(human: number): bigint {
  const v = human * (1 + (Math.random() - 0.5) * 0.006)
  return BigInt(Math.round(v * 1_000_000))
}

/** Raw input-token units for a given USDC human amount. */
function inputRaw(usdcHuman: number, mint: string): bigint {
  if (mint === USDC)  return usdcRaw(usdcHuman)
  if (mint === SOL)   return BigInt(Math.round((usdcHuman / 145) * 1e9))
  if (mint === BONK)  return BigInt(Math.round((usdcHuman / 0.000027) * 1e5))
  if (mint === JUP)   return BigInt(Math.round((usdcHuman / 0.65) * 1e6))
  return usdcRaw(usdcHuman)
}

/** Randomly pick a payer token. */
function pickMint(): string {
  const r = Math.random()
  if (r < 0.45) return SOL
  if (r < 0.65) return BONK
  if (r < 0.80) return JUP
  return USDC
}

// Pool of realistic buyer wallets.
const BUYERS = Array.from({ length: 18 }, pubkey)
const buyer  = () => BUYERS[~~(Math.random() * BUYERS.length)]

// ─── Prisma client ────────────────────────────────────────────────────────────
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma  = new PrismaClient({ adapter })

// ─── Teardown ─────────────────────────────────────────────────────────────────
async function teardown(merchantId: string) {
  // Delete in dependency order (PaymentExecution has Restrict FKs on parents).
  await prisma.paymentExecution.deleteMany({
    where: {
      OR: [
        { link:    { merchantId } },
        { invoice: { merchantId } },
        { renewal: { subscriber: { plan: { merchantId } } } },
        { merchantId },
      ],
    },
  })
  await prisma.subscriptionRenewal.deleteMany({
    where: { subscriber: { plan: { merchantId } } },
  })
  await prisma.subscriber.deleteMany({
    where: { plan: { merchantId } },
  })
  await prisma.subscriptionPlan.deleteMany({ where: { merchantId } })
  await prisma.splitRecipient.deleteMany({ where: { link: { merchantId } } })
  await prisma.paymentLink.deleteMany({ where: { merchantId } })
  await prisma.invoiceItem.deleteMany({ where: { invoice: { merchantId } } })
  await prisma.invoice.deleteMany({ where: { merchantId } })
  await prisma.apiKey.deleteMany({ where: { merchantId } })
  console.log('  ✓ existing data cleared')
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🌱  Seeding demo data…\n')

  // ── 1. Merchant ─────────────────────────────────────────────────────────────
  const merchant = await prisma.merchant.upsert({
    where:  { wallet: MERCHANT_WALLET },
    update: { lastSeenAt: new Date() },
    create: {
      wallet:        MERCHANT_WALLET,
      webhookUrl:    'https://hooks.example.com/settlix',
      webhookSecret: 'whsec_' + hex64().slice(0, 32),
      createdAt:     pastDate(120),
      lastSeenAt:    new Date(),
    },
  })
  console.log('✓  Merchant upserted:', merchant.id)

  await teardown(merchant.id)

  // ── 2. API Keys ──────────────────────────────────────────────────────────────
  await prisma.apiKey.createMany({
    data: [
      { merchantId: merchant.id, keyHash: hex64(), name: 'Production',
        createdAt: pastDate(90), lastUsedAt: pastDate(1) },
      { merchantId: merchant.id, keyHash: hex64(), name: 'Staging',
        createdAt: pastDate(60), lastUsedAt: pastDate(8) },
    ],
  })
  console.log('✓  API keys (2)')

  // ── 3. Payment Links ─────────────────────────────────────────────────────────
  const [lConsulting, lDesign, lApi, lBrand, lLanding, lSprint] = await Promise.all([
    prisma.paymentLink.create({ data: {
      merchantId: merchant.id, token: USDC, amount: '400.000000',
      type: PaymentLinkType.fixed, active: true,
      title: 'Consulting Session',
      description: '1-hour advisory — web3 product strategy, architecture, and go-to-market.',
      createdAt: pastDate(110),
    }}),
    prisma.paymentLink.create({ data: {
      merchantId: merchant.id, token: USDC, amount: '750.000000',
      type: PaymentLinkType.fixed, active: true,
      title: 'Design Package Pro',
      description: 'Full UI/UX package — wireframes, hi-fi mockups, prototype, and design system.',
      createdAt: pastDate(100),
    }}),
    prisma.paymentLink.create({ data: {
      merchantId: merchant.id, token: USDC, amount: '150.000000',
      type: PaymentLinkType.fixed, active: true,
      title: 'API Access — Monthly',
      description: 'Monthly access with up to 1 000 API requests.',
      maxUses: 50,
      createdAt: pastDate(95),
    }}),
    prisma.paymentLink.create({ data: {
      merchantId: merchant.id, token: USDC, amount: '350.000000',
      type: PaymentLinkType.fixed, active: true,
      title: 'Brand Identity Kit',
      description: 'Logo (3 concepts), colour palette, typography guide, and brand PDF.',
      createdAt: pastDate(85),
    }}),
    prisma.paymentLink.create({ data: {
      merchantId: merchant.id, token: USDC, amount: '450.000000',
      type: PaymentLinkType.fixed, active: true,
      title: 'Landing Page Build',
      description: 'Custom Next.js marketing page — SEO-optimised, conversion-ready.',
      createdAt: pastDate(50),
    }}),
    prisma.paymentLink.create({ data: {
      merchantId: merchant.id, token: USDC, amount: '1200.000000',
      type: PaymentLinkType.fixed, active: false,
      title: 'Dev Sprint',
      description: 'One-week intensive MVP development sprint.',
      createdAt: pastDate(70),
      archivedAt: pastDate(30),
    }}),
  ])
  console.log('✓  Payment links (6)')

  // Split recipients on API Access link (80 / 20)
  const partner = pubkey()
  await prisma.splitRecipient.createMany({
    data: [
      { linkId: lApi.id, wallet: MERCHANT_WALLET, basisPoints: 8000, displayOrder: 0 },
      { linkId: lApi.id, wallet: partner,          basisPoints: 2000, displayOrder: 1 },
    ],
  })

  // ── 4. Payment Link Executions ───────────────────────────────────────────────
  // Distribution: past 60 days, heavier weight on last 30 for chart visibility.
  type ExecSpec = { linkId: string; amount: number; daysAgo: number; failed?: true }

  const execSpecs: ExecSpec[] = [
    // Consulting — 8 payments spread over 60 days
    { linkId: lConsulting.id, amount: 400, daysAgo: 58 },
    { linkId: lConsulting.id, amount: 400, daysAgo: 50 },
    { linkId: lConsulting.id, amount: 400, daysAgo: 41 },
    { linkId: lConsulting.id, amount: 400, daysAgo: 27 },
    { linkId: lConsulting.id, amount: 400, daysAgo: 19 },
    { linkId: lConsulting.id, amount: 400, daysAgo: 11, failed: true },
    { linkId: lConsulting.id, amount: 400, daysAgo: 8 },
    { linkId: lConsulting.id, amount: 400, daysAgo: 2 },
    // Design Package — 5 payments
    { linkId: lDesign.id, amount: 750, daysAgo: 55 },
    { linkId: lDesign.id, amount: 750, daysAgo: 44 },
    { linkId: lDesign.id, amount: 750, daysAgo: 25 },
    { linkId: lDesign.id, amount: 750, daysAgo: 13 },
    { linkId: lDesign.id, amount: 750, daysAgo: 4 },
    // API Access — 9 payments
    { linkId: lApi.id, amount: 150, daysAgo: 60 },
    { linkId: lApi.id, amount: 150, daysAgo: 52 },
    { linkId: lApi.id, amount: 150, daysAgo: 45 },
    { linkId: lApi.id, amount: 150, daysAgo: 38 },
    { linkId: lApi.id, amount: 150, daysAgo: 28 },
    { linkId: lApi.id, amount: 150, daysAgo: 21 },
    { linkId: lApi.id, amount: 150, daysAgo: 14 },
    { linkId: lApi.id, amount: 150, daysAgo: 7 },
    { linkId: lApi.id, amount: 150, daysAgo: 1 },
    // Brand Identity — 5 payments
    { linkId: lBrand.id, amount: 350, daysAgo: 47 },
    { linkId: lBrand.id, amount: 350, daysAgo: 33 },
    { linkId: lBrand.id, amount: 350, daysAgo: 22 },
    { linkId: lBrand.id, amount: 350, daysAgo: 10 },
    { linkId: lBrand.id, amount: 350, daysAgo: 3 },
    // Landing Page — 3 payments
    { linkId: lLanding.id, amount: 450, daysAgo: 29 },
    { linkId: lLanding.id, amount: 450, daysAgo: 16 },
    { linkId: lLanding.id, amount: 450, daysAgo: 5 },
    // Dev Sprint (archived) — 1 old payment
    { linkId: lSprint.id, amount: 1200, daysAgo: 55 },
  ]

  for (const s of execSpecs) {
    const mint = pickMint()
    const out  = s.failed ? BigInt(0) : usdcRaw(s.amount)
    const inp  = s.failed ? BigInt(0) : inputRaw(s.amount, mint)
    await prisma.paymentExecution.create({ data: {
      clientExecutionId: uuid(),
      source:            PaymentExecutionSource.payment_link,
      linkId:            s.linkId,
      userWallet:        buyer(),
      inputToken:        mint,
      inputAmount:       inp,
      outputAmount:      out,
      txSignature:       sig(),
      status:            s.failed ? PaymentExecutionStatus.failed : PaymentExecutionStatus.paid,
      createdAt:         pastDate(s.daysAgo),
      distributedAt:     s.failed ? null : pastDate(s.daysAgo),
      metadata: { route: mint === USDC ? 'direct' : 'Jupiter v6' },
    }})
  }
  console.log(`✓  Payment link executions (${execSpecs.length})`)

  // ── 5. Invoices ──────────────────────────────────────────────────────────────
  // Paid invoice
  const invPaid = await prisma.invoice.create({ data: {
    merchantId: merchant.id,
    clientName:  'Alex Chen',
    clientEmail: 'alex@techstart.io',
    dueDate:     pastDate(25),
    memo:        'Web3 product strategy session for TechStart protocol launch.',
    token:       USDC,
    amount:      '400.000000',
    createdAt:   pastDate(35),
    lineItems: { create: [
      { description: 'Strategy & Advisory Session (1 hr)', quantity: '1.0000', unitPrice: '400.000000' },
    ]},
  }})

  // Unpaid invoice — due in future
  const invUnpaid = await prisma.invoice.create({ data: {
    merchantId: merchant.id,
    clientName:  'Sarah Johnson',
    clientEmail: 'sarah@acmecreative.co',
    dueDate:     futureDate(12),
    memo:        "Full design package for Acme Creative's web3 dashboard.",
    token:       USDC,
    amount:      '750.000000',
    createdAt:   pastDate(10),
    lineItems: { create: [
      { description: 'UI Design — Dashboard & Component Library',  quantity: '1.0000', unitPrice: '500.000000' },
      { description: 'UX Wireframes & Interactive Prototype',       quantity: '1.0000', unitPrice: '250.000000' },
    ]},
  }})

  // Overdue invoice — past due, unpaid
  const invOverdue = await prisma.invoice.create({ data: {
    merchantId: merchant.id,
    clientName:  'Marcus Rivera',
    clientEmail: 'marcus@novalabs.xyz',
    dueDate:     pastDate(8),
    memo:        'Brand identity package for Nova Labs — logo, palette, and guidelines.',
    token:       USDC,
    amount:      '350.000000',
    createdAt:   pastDate(20),
    lineItems: { create: [
      { description: 'Logo Design (3 concepts, unlimited revisions)', quantity: '1.0000', unitPrice: '200.000000' },
      { description: 'Brand Guidelines Document',                      quantity: '1.0000', unitPrice: '150.000000' },
    ]},
  }})
  void invUnpaid, invOverdue // referenced above to satisfy linter

  // Paid execution for Alex Chen invoice
  await prisma.paymentExecution.create({ data: {
    clientExecutionId: uuid(),
    source:      PaymentExecutionSource.invoice,
    invoiceId:   invPaid.id,
    userWallet:  buyer(),
    inputToken:  USDC,
    inputAmount: usdcRaw(400),
    outputAmount: usdcRaw(400),
    txSignature: sig(),
    status:      PaymentExecutionStatus.paid,
    createdAt:   pastDate(22),
  }})
  console.log('✓  Invoices (3: 1 paid, 1 unpaid, 1 overdue)')

  // ── 6. Subscription Plans ────────────────────────────────────────────────────
  const [planPro, planCreator, planEnterprise] = await Promise.all([
    prisma.subscriptionPlan.create({ data: {
      merchantId: merchant.id,
      token:       USDC,
      amount:      '49.000000',
      interval:    SubscriptionInterval.weekly,
      active:      true,
      title:       'Pro Weekly',
      description: 'Full platform access billed weekly.',
      createdAt:   pastDate(90),
    }}),
    prisma.subscriptionPlan.create({ data: {
      merchantId: merchant.id,
      token:       USDC,
      amount:      '25.000000',
      interval:    SubscriptionInterval.weekly,
      active:      true,
      title:       'Creator Weekly',
      description: 'Essential tools for individual creators.',
      createdAt:   pastDate(80),
    }}),
    prisma.subscriptionPlan.create({ data: {
      merchantId: merchant.id,
      token:       USDC,
      amount:      '199.000000',
      interval:    SubscriptionInterval.weekly,
      active:      true,
      title:       'Enterprise Weekly',
      description: 'Unlimited access with priority support.',
      createdAt:   pastDate(70),
    }}),
  ])
  console.log('✓  Subscription plans (3)')

  // ── 7. Subscribers + Renewals + Executions ───────────────────────────────────
  type SubSpec = {
    plan: typeof planPro
    name: string
    email: string
    status: SubscriptionStatus
    renewalDaysAgo: number[]   // each entry = one succeeded renewal that many days ago
    failedRenewalDayAgo?: number
    cancelledDaysAgo?: number
  }

  const subSpecs: SubSpec[] = [
    // Pro Weekly — 3 active, 1 past_due, 1 cancelled
    { plan: planPro, name: 'Jordan Lee',   email: 'jordan@blocklab.io',
      status: SubscriptionStatus.active,
      renewalDaysAgo: [56, 49, 42, 35, 28, 21, 14, 7] },
    { plan: planPro, name: 'Priya Nair',   email: 'priya@chainworks.co',
      status: SubscriptionStatus.active,
      renewalDaysAgo: [42, 35, 28, 21, 14, 7] },
    { plan: planPro, name: 'Carlos Vega',  email: 'carlos@staking.xyz',
      status: SubscriptionStatus.active,
      renewalDaysAgo: [28, 21, 14, 7] },
    { plan: planPro, name: 'Yuki Tanaka',  email: 'yuki@defi.run',
      status: SubscriptionStatus.past_due,
      renewalDaysAgo: [35, 28, 21],
      failedRenewalDayAgo: 7 },
    { plan: planPro, name: 'Omar Hassan',  email: 'omar@nftdrop.io',
      status: SubscriptionStatus.cancelled,
      renewalDaysAgo: [42, 35, 28],
      cancelledDaysAgo: 20 },
    // Creator Weekly — 2 active, 1 cancelled
    { plan: planCreator, name: 'Maya Patel',    email: 'maya@pixelcraft.art',
      status: SubscriptionStatus.active,
      renewalDaysAgo: [35, 28, 21, 14, 7] },
    { plan: planCreator, name: 'Liam Nguyen',   email: 'liam@creatorhub.io',
      status: SubscriptionStatus.active,
      renewalDaysAgo: [21, 14, 7] },
    { plan: planCreator, name: 'Anya Okonkwo',  email: 'anya@studio3.xyz',
      status: SubscriptionStatus.cancelled,
      renewalDaysAgo: [28, 21],
      cancelledDaysAgo: 15 },
    // Enterprise Weekly — 2 active
    { plan: planEnterprise, name: 'TechStart Inc.',    email: 'billing@techstart.io',
      status: SubscriptionStatus.active,
      renewalDaysAgo: [28, 21, 14, 7] },
    { plan: planEnterprise, name: 'Nova Labs',         email: 'billing@novalabs.xyz',
      status: SubscriptionStatus.active,
      renewalDaysAgo: [21, 14, 7] },
  ]

  let totalRenewals = 0

  for (const spec of subSpecs) {
    const subWallet = pubkey()  // unique per subscriber to satisfy @@unique([planId, subscriberWallet])
    const createdAt = pastDate(spec.renewalDaysAgo[spec.renewalDaysAgo.length - 1] + 2)
    const currentPeriodEnd = futureDate(spec.status === SubscriptionStatus.active ? 4 : 0)

    const sub = await prisma.subscriber.create({ data: {
      planId:           spec.plan.id,
      subscriberWallet: subWallet,
      subscriberName:   spec.name,
      subscriberEmail:  spec.email,
      status:           spec.status,
      currentPeriodEnd,
      cancelledAt:      spec.cancelledDaysAgo ? pastDate(spec.cancelledDaysAgo) : null,
      createdAt,
    }})

    // Succeeded renewals
    for (const dAgo of spec.renewalDaysAgo) {
      const renewedAt = pastDate(dAgo)
      const mint = pickMint()
      const amount = Number(spec.plan.amount)

      const renewal = await prisma.subscriptionRenewal.create({ data: {
        subscriberId:    sub.id,
        amountSnapshot:  spec.plan.amount,
        tokenSnapshot:   spec.plan.token,
        periodStart:     new Date(renewedAt.getTime() - 7 * 24 * 3600_000),
        dueAt:           renewedAt,
        status:          RenewalStatus.succeeded,
        attemptCount:    1,
        executedAt:      renewedAt,
        createdAt:       renewedAt,
      }})

      await prisma.paymentExecution.create({ data: {
        clientExecutionId: uuid(),
        source:            PaymentExecutionSource.subscription,
        renewalId:         renewal.id,
        userWallet:        subWallet,
        inputToken:        mint,
        inputAmount:       inputRaw(amount, mint),
        outputAmount:      usdcRaw(amount),
        txSignature:       sig(),
        status:            PaymentExecutionStatus.paid,
        createdAt:         renewedAt,
      }})

      totalRenewals++
    }

    // Failed renewal (past_due subscriber)
    if (spec.failedRenewalDayAgo !== undefined) {
      const failedAt = pastDate(spec.failedRenewalDayAgo)
      const renewal = await prisma.subscriptionRenewal.create({ data: {
        subscriberId:    sub.id,
        amountSnapshot:  spec.plan.amount,
        tokenSnapshot:   spec.plan.token,
        periodStart:     new Date(failedAt.getTime() - 7 * 24 * 3600_000),
        dueAt:           failedAt,
        status:          RenewalStatus.failed,
        attemptCount:    2,
        executedAt:      null,
        failureReason:   'Insufficient balance',
        createdAt:       failedAt,
      }})

      await prisma.paymentExecution.create({ data: {
        clientExecutionId: uuid(),
        source:            PaymentExecutionSource.subscription,
        renewalId:         renewal.id,
        userWallet:        subWallet,
        inputToken:        USDC,
        inputAmount:       BigInt(0),
        outputAmount:      BigInt(0),
        txSignature:       sig(),
        status:            PaymentExecutionStatus.failed,
        createdAt:         failedAt,
      }})
    }
  }
  console.log(`✓  Subscribers (${subSpecs.length}) + renewals (${totalRenewals} succeeded)`)

  // ── 8. Direct Transfers ──────────────────────────────────────────────────────
  const directSpecs = [
    { daysAgo: 18, amount: 80,  label: 'Personal Pay Link' },
    { daysAgo: 12, amount: 200, label: 'Direct Send'       },
    { daysAgo: 9,  amount: 55,  label: 'Personal Pay Link' },
    { daysAgo: 5,  amount: 130, label: 'Direct Send'       },
    { daysAgo: 2,  amount: 300, label: 'Personal Pay Link' },
  ]

  for (const d of directSpecs) {
    const mint = pickMint()
    await prisma.paymentExecution.create({ data: {
      clientExecutionId: uuid(),
      source:            PaymentExecutionSource.direct_transfer,
      merchantId:        merchant.id,
      userWallet:        buyer(),
      inputToken:        mint,
      inputAmount:       inputRaw(d.amount, mint),
      outputAmount:      usdcRaw(d.amount),
      txSignature:       sig(),
      status:            PaymentExecutionStatus.paid,
      createdAt:         pastDate(d.daysAgo),
      metadata:          { label: d.label },
    }})
  }
  console.log(`✓  Direct transfers (${directSpecs.length})`)

  // ── Summary ──────────────────────────────────────────────────────────────────
  const [execCount, subCount] = await Promise.all([
    prisma.paymentExecution.count({ where: { status: 'paid', OR: [
      { link: { merchantId: merchant.id } },
      { invoice: { merchantId: merchant.id } },
      { renewal: { subscriber: { plan: { merchantId: merchant.id } } } },
      { merchantId: merchant.id },
    ]}}),
    prisma.subscriber.count({ where: { plan: { merchantId: merchant.id }, status: 'active' } }),
  ])

  console.log(`
┌────────────────────────────────────────────────────────┐
│  Seed complete ✓                                       │
│  Merchant   ${MERCHANT_WALLET.slice(0, 12)}…           │
│  Paid executions  ${String(execCount).padEnd(4)}                           │
│  Active subscribers  ${String(subCount).padEnd(3)}                        │
│  Period     last 60 days → today                       │
└────────────────────────────────────────────────────────┘
`)
}

main()
  .catch((e) => { console.error('❌  Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
