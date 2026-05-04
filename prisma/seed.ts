import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, PaymentLinkType } from '../lib/generated/prisma/client'
import cuid from 'cuid'

// ─── Config ──────────────────────────────────────────────────────────────────

const MERCHANT_WALLET = 'Ew71o1mNpV4PG7Z5vVLnJfqrVdnZfy2TmsQsdHjufxN3'
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const SOL_MINT = 'So11111111111111111111111111111111111111112'
const BONK_MINT = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
const PONKE_MINT = '5z3EqYQo9HiCEs3R84RCDMu2n7anpDMxRhdK8PSWmrRC'

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fakeSig = () => Array.from({ length: 88 }, () => B58[~~(Math.random() * 58)]).join('')
const fakePubkey = () => Array.from({ length: 44 }, () => B58[~~(Math.random() * 58)]).join('')
const fakeKeyHash = () => Array.from({ length: 64 }, () => '0123456789abcdef'[~~(Math.random() * 16)]).join('')

function randDate(year: number, month: number, maxDay = 27): Date {
  const day = 1 + ~~(Math.random() * maxDay)
  const hour = ~~(Math.random() * 24)
  const min = ~~(Math.random() * 60)
  const sec = ~~(Math.random() * 60)
  return new Date(year, month - 1, day, hour, min, sec)
}

// Approximate USDC/token rates (Jan–Apr 2026 estimates)
const INPUT_TOKENS = [
  { mint: SOL_MINT, rate: 138, decimals: 9 }, // SOL — 40% of txs
  { mint: BONK_MINT, rate: 0.0000275, decimals: 5 }, // BONK — 20%
  { mint: PONKE_MINT, rate: 0.0000001, decimals: 9 }, // PONKE — 20%
  { mint: USDC_MINT, rate: 1, decimals: 6 }, // USDC — 20%
]

function pickToken() {
  const r = Math.random()
  if (r < 0.4) return INPUT_TOKENS[0]
  if (r < 0.6) return INPUT_TOKENS[1]
  if (r < 0.8) return INPUT_TOKENS[2]
  return INPUT_TOKENS[3]
}

// Simulate tiny slippage (±0.4%), returns raw USDC units (6 decimals)
function usdcUnits(humanAmount: number): bigint {
  const slipped = humanAmount * (1 + (Math.random() - 0.5) * 0.008)
  return BigInt(Math.round(slipped * 1_000_000))
}

// Convert human USDC amount → raw input token units
function toInputUnits(usdcHuman: number, rate: number, decimals: number): bigint {
  const usdcScaled = BigInt(Math.round(usdcHuman * 1_000_000_000_000))
  const rateScaled = BigInt(Math.round(rate * 1_000_000_000_000))
  if (rateScaled === BigInt(0)) return BigInt(0)
  return (usdcScaled * BigInt(10) ** BigInt(decimals)) / rateScaled
}

// ─── Static buyer wallets ─────────────────────────────────────────────────────

const BUYERS = Array.from({ length: 14 }, fakePubkey)
const pickBuyer = () => BUYERS[~~(Math.random() * BUYERS.length)]

// ─── Payment Links ────────────────────────────────────────────────────────────

const ID1 = cuid()
const ID2 = cuid()
const ID3 = cuid()
const ID4 = cuid()
const ID5 = cuid()
const ID6 = cuid()

const LINKS = [
  {
    id: ID1,
    token: USDC_MINT,
    amount: '400.000000',
    type: 'fixed',
    active: true,
    title: 'Consulting Session',
    description: '1-hour advisory covering web3 product strategy, architecture, and go-to-market planning.',
    createdAt: new Date('2026-01-04T09:00:00Z'),
  },
  {
    id: ID2,
    token: USDC_MINT,
    amount: '750.000000',
    type: 'fixed',
    active: true,
    title: 'Design Package Pro',
    description: 'Full UI/UX package — wireframes, high-fidelity mockups, interactive prototype, and design system.',
    createdAt: new Date('2026-01-06T11:30:00Z'),
  },
  {
    id: ID3,
    token: USDC_MINT,
    amount: '150.000000',
    type: 'fixed',
    active: true,
    title: 'API Access — Monthly',
    description: 'Monthly Settlix API subscription with up to 1,000 requests per calendar month.',
    maxUses: 100,
    createdAt: new Date('2026-01-08T14:00:00Z'),
  },
  {
    id: ID4,
    token: USDC_MINT,
    amount: '1200.000000',
    type: 'fixed',
    active: false,
    title: 'Development Sprint',
    description: 'One-week intensive development sprint for MVP feature delivery and technical architecture.',
    createdAt: new Date('2026-01-10T10:00:00Z'),
    archivedAt: new Date('2026-02-28T10:00:00Z'),
  },
  {
    id: ID5,
    token: USDC_MINT,
    amount: '350.000000',
    type: 'fixed',
    active: true,
    title: 'Brand Identity Kit',
    description: 'Logo design (3 concepts), color palette, typography guide, and brand guidelines PDF.',
    createdAt: new Date('2026-01-12T16:00:00Z'),
  },
  {
    id: ID6,
    token: USDC_MINT,
    amount: '450.000000',
    type: 'fixed',
    active: true,
    title: 'Landing Page Build',
    description: 'Custom marketing landing page built with Next.js and Tailwind — SEO-optimised, conversion-ready.',
    createdAt: new Date('2026-02-20T09:30:00Z'),
  },
]

// ─── Execution plan ───────────────────────────────────────────────────────────

type Batch = { linkId: string; amount: number; month: number; count: number }

const BATCHES: Batch[] = [
  // ── January ──
  { linkId: ID1, amount: 400, month: 1, count: 3 },
  { linkId: ID2, amount: 750, month: 1, count: 2 },
  { linkId: ID3, amount: 150, month: 1, count: 3 },
  { linkId: ID4, amount: 1200, month: 1, count: 1 },
  { linkId: ID5, amount: 350, month: 1, count: 1 },
  // ── February ──
  { linkId: ID1, amount: 400, month: 2, count: 2 },
  { linkId: ID2, amount: 750, month: 2, count: 1 },
  { linkId: ID3, amount: 150, month: 2, count: 3 },
  { linkId: ID5, amount: 350, month: 2, count: 3 },
  // ── March ──
  { linkId: ID1, amount: 400, month: 3, count: 3 },
  { linkId: ID2, amount: 750, month: 3, count: 2 },
  { linkId: ID3, amount: 150, month: 3, count: 3 },
  { linkId: ID5, amount: 350, month: 3, count: 2 },
  { linkId: ID6, amount: 450, month: 3, count: 1 },
  // ── April ──
  { linkId: ID1, amount: 400, month: 4, count: 1 },
  { linkId: ID3, amount: 150, month: 4, count: 2 },
  { linkId: ID5, amount: 350, month: 4, count: 1 },
  { linkId: ID6, amount: 450, month: 4, count: 1 },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter })

  console.log('🌱  Seeding demo data...\n')

  // Merchant
  const merchant = await prisma.merchant.create({
    data: {
      wallet: MERCHANT_WALLET,
      webhookUrl: 'https://hooks.example.com/settlix',
      webhookSecret: 'whsec_' + fakeKeyHash().slice(0, 32),
      createdAt: new Date('2026-01-01T08:00:00Z'),
      lastSeenAt: new Date('2026-04-30T10:00:00Z'),
    },
  })
  console.log('✓  Merchant created')

  // Payment links
  for (const link of LINKS) {
    await prisma.paymentLink.create({ data: { ...link, type: link.type as PaymentLinkType, merchantId: merchant.id } })
  }
  console.log('✓  Payment links created (6)')

  // Split recipients on API Access link (80 / 20)
  const partnerWallet = fakePubkey()
  await prisma.splitRecipient.createMany({
    data: [
      { linkId: ID3, wallet: MERCHANT_WALLET, basisPoints: 8000, displayOrder: 0 },
      { linkId: ID3, wallet: partnerWallet, basisPoints: 2000, displayOrder: 1 },
    ],
  })
  console.log('✓  Split recipients created (API Access link — 80/20)')

  // Invoices (standalone, no linkId)
  const INVOICES = [
    {
      id: 'inv_001',
      clientName: 'Alex Chen',
      clientEmail: 'alex@techstart.io',
      dueDate: new Date('2026-02-15'),
      memo: 'Web3 product strategy session for TechStart protocol launch.',
      createdAt: new Date('2026-01-14T10:00:00Z'),
      lineItems: [{ description: 'Strategy & Advisory Session (1 hr)', quantity: '1.0000', unitPrice: '400.000000' }],
    },
    {
      id: 'inv_002',
      clientName: 'Sarah Johnson',
      clientEmail: 'sarah@acmecreative.co',
      dueDate: new Date('2026-02-28'),
      memo: "Full design package for Acme Creative's web3 dashboard product.",
      createdAt: new Date('2026-01-28T14:00:00Z'),
      lineItems: [
        { description: 'UI Design — Dashboard & Component Library', quantity: '1.0000', unitPrice: '500.000000' },
        { description: 'UX Wireframes & Interactive Prototype', quantity: '1.0000', unitPrice: '250.000000' },
      ],
    },
    {
      id: 'inv_003',
      clientName: 'Marcus Rivera',
      clientEmail: 'marcus@novalabs.xyz',
      dueDate: new Date('2026-03-15'),
      memo: 'Brand identity package for Nova Labs — logo, palette, and guidelines.',
      createdAt: new Date('2026-02-14T09:30:00Z'),
      lineItems: [
        { description: 'Logo Design (3 concepts, unlimited revisions)', quantity: '1.0000', unitPrice: '200.000000' },
        { description: 'Brand Guidelines Document', quantity: '1.0000', unitPrice: '150.000000' },
      ],
    },
  ]

  for (const { lineItems, ...inv } of INVOICES) {
    const amount = lineItems.reduce((sum, item) => sum + parseFloat(item.unitPrice) * parseFloat(item.quantity), 0)
    await prisma.invoice.create({
      data: {
        ...inv,
        merchantId: merchant.id,
        token: USDC_MINT,
        amount: amount.toFixed(6),
        lineItems: { create: lineItems },
      },
    })
  }
  console.log('✓  Invoices created (3) with line items')

  // API keys
  await prisma.apiKey.createMany({
    data: [
      {
        merchantId: merchant.id,
        keyHash: fakeKeyHash(),
        name: 'Production',
        createdAt: new Date('2026-01-15T10:00:00Z'),
        lastUsedAt: new Date('2026-04-29T15:32:00Z'),
      },
      {
        merchantId: merchant.id,
        keyHash: fakeKeyHash(),
        name: 'Staging',
        createdAt: new Date('2026-01-20T14:00:00Z'),
        lastUsedAt: new Date('2026-03-18T09:15:00Z'),
      },
    ],
  })
  console.log('✓  API keys created (2)')

  // Payment executions
  let totalExecs = 0
  let totalUsdc = 0
  const failedIdx = 7 // make the 8th execution (0-indexed) a failed one for realism

  for (const batch of BATCHES) {
    for (let i = 0; i < batch.count; i++) {
      const token = pickToken()
      const outUnits = usdcUnits(batch.amount)
      const inUnits = toInputUnits(batch.amount, token.rate, token.decimals)
      const createdAt = randDate(2026, batch.month)
      const isFailed = totalExecs === failedIdx

      await prisma.paymentExecution.create({
        data: {
          clientExecutionId: crypto.randomUUID(),
          source: 'payment_link',
          linkId: batch.linkId,
          userWallet: pickBuyer(),
          inputToken: token.mint,
          inputAmount: inUnits,
          outputAmount: isFailed ? BigInt(0) : outUnits,
          txSignature: fakeSig(),
          status: isFailed ? 'failed' : 'paid',
          distributedAt: isFailed ? null : new Date(createdAt.getTime() + 2800 + ~~(Math.random() * 1200)),
          metadata: {
            route: 'Jupiter v6',
            slippage: `${(Math.random() * 0.4 + 0.05).toFixed(2)}%`,
            hops: token.mint === USDC_MINT ? 0 : 1,
          },
          createdAt,
        },
      })

      if (!isFailed) totalUsdc += Number(outUnits) / 1_000_000
      totalExecs++
    }
  }

  const summary = `
✓  Payment executions created (${totalExecs} total — ${totalExecs - 1} paid, 1 failed)

┌─────────────────────────────────────────────┐
│  Seed complete                              │
│  Merchant  ${MERCHANT_WALLET.slice(0, 8)}…  │
│  Revenue   ~$${totalUsdc.toFixed(2)} USDC          │
│  Period    Jan 2026 – Apr 2026              │
└─────────────────────────────────────────────┘
`
  console.log(summary)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('❌  Seed failed:', err)
  process.exit(1)
})
