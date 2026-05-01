import { notFound } from 'next/navigation'
import { getInvoiceById, deriveInvoiceStatus } from '@/lib/services/invoice.service'
import { InvoicePayCard, type InvoiceData } from '@/components/invoice/invoice-pay-card'
import { getTokenByMint } from '@/lib/tokens/tokens'
import { rawToHumanAmount } from '@/lib/solana/amount'

interface Props {
  params: Promise<{ id: string }>
}

export default async function InvoicePage({ params }: Props) {
  const { id } = await params
  const invoice = await getInvoiceById(id).catch(() => null)

  if (!invoice) notFound()

  const paidExecution = invoice.link.executions[0] ?? null
  const status = deriveInvoiceStatus(invoice.dueDate, paidExecution?.createdAt ?? null)

  const inputTokenEntry = paidExecution ? getTokenByMint(paidExecution.inputToken) : null
  const settlementTokenEntry = getTokenByMint(invoice.token)

  const data: InvoiceData = {
    id: invoice.id,
    merchantWallet: invoice.merchantWallet,
    clientName: invoice.clientName,
    clientEmail: invoice.clientEmail,
    dueDate: invoice.dueDate?.toISOString() ?? null,
    memo: invoice.memo,
    token: invoice.token,
    tokenSymbol: settlementTokenEntry?.symbol ?? invoice.token,
    amount: invoice.link.amount.toString(),
    linkId: invoice.linkId,
    status,
    paidAt: paidExecution?.createdAt.toISOString() ?? null,
    txSignature: paidExecution?.txSignature ?? null,
    createdAt: invoice.createdAt.toISOString(),
    lineItems: invoice.lineItems.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
    })),
    inputToken: paidExecution?.inputToken ?? null,
    inputTokenSymbol: inputTokenEntry?.symbol ?? null,
    inputAmount:
      paidExecution && inputTokenEntry ? rawToHumanAmount(paidExecution.inputAmount, inputTokenEntry.decimals) : null,
  }

  return <InvoicePayCard invoice={data} />
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const invoice = await getInvoiceById(id).catch(() => null)
  const title = invoice?.clientName ? `Invoice · ${invoice.clientName} · Settlix` : 'Invoice · Settlix'
  return { title }
}
