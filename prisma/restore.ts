import 'dotenv/config'
import { readFileSync } from 'fs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../lib/generated/prisma/client'

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter })

  const raw = readFileSync('backup.json', 'utf-8')

  // Revive { __bigint: "123" } → BigInt(123)
  const data = JSON.parse(raw, (_, v) => {
    if (v !== null && typeof v === 'object' && '__bigint' in v) return BigInt(v.__bigint)
    return v
  })

  console.log(`📥  Restoring backup from ${data.exportedAt}\n`)

  // Insert in FK-dependency order
  await prisma.merchant.createMany({ data: data.merchants })
  console.log(`✓  ${data.merchants.length} merchants`)

  await prisma.paymentLink.createMany({ data: data.paymentLinks })
  console.log(`✓  ${data.paymentLinks.length} payment links`)

  await prisma.splitRecipient.createMany({ data: data.splitRecipients })
  console.log(`✓  ${data.splitRecipients.length} split recipients`)

  await prisma.invoice.createMany({ data: data.invoices })
  console.log(`✓  ${data.invoices.length} invoices`)

  await prisma.invoiceItem.createMany({ data: data.invoiceItems })
  console.log(`✓  ${data.invoiceItems.length} invoice items`)

  await prisma.apiKey.createMany({ data: data.apiKeys })
  console.log(`✓  ${data.apiKeys.length} API keys`)

  await prisma.paymentExecution.createMany({ data: data.paymentExecutions })
  console.log(`✓  ${data.paymentExecutions.length} payment executions`)

  console.log('\n✅  Restore complete')
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('❌  Restore failed:', err)
  process.exit(1)
})
