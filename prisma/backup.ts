import 'dotenv/config'
import { writeFileSync } from 'fs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../lib/generated/prisma/client'

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter })

  console.log('📦  Reading all tables...')

  const [merchants, paymentLinks, splitRecipients, invoices, invoiceItems, apiKeys, paymentExecutions] =
    await Promise.all([
      prisma.merchant.findMany(),
      prisma.paymentLink.findMany(),
      prisma.splitRecipient.findMany(),
      prisma.invoice.findMany(),
      prisma.invoiceItem.findMany(),
      prisma.apiKey.findMany(),
      prisma.paymentExecution.findMany(),
    ])

  const payload = {
    exportedAt: new Date().toISOString(),
    merchants,
    paymentLinks,
    splitRecipients,
    invoices,
    invoiceItems,
    apiKeys,
    paymentExecutions,
  }

  // BigInt → { __bigint: "123" } so JSON.stringify doesn't throw
  const json = JSON.stringify(payload, (_, v) => (typeof v === 'bigint' ? { __bigint: v.toString() } : v), 2)

  writeFileSync('backup.json', json, 'utf-8')

  console.log(`\n✅  Backup saved to backup.json`)
  console.log(`   ${merchants.length} merchants`)
  console.log(`   ${paymentLinks.length} payment links`)
  console.log(`   ${invoices.length} invoices  (${invoiceItems.length} line items)`)
  console.log(`   ${paymentExecutions.length} executions`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('❌  Backup failed:', err)
  process.exit(1)
})
