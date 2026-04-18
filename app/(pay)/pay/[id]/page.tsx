import { notFound } from 'next/navigation'
import { PayCard } from '@/components/pay/pay-card'
import { getPaymentLinkById } from '@/lib/services/payment-link.service'
import { paymentLinkId } from '@/lib/validation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PayPage({ params }: Props) {
  const { id } = await params
  const parsedId = paymentLinkId.safeParse(id)

  if (!parsedId.success) {
    notFound()
  }

  return <PayCard linkId={parsedId.data} />
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const parsedId = paymentLinkId.safeParse(id)

  if (!parsedId.success) {
    return { title: 'Pay · SettleX' }
  }

  const link = await getPaymentLinkById(parsedId.data).catch(() => null)
  const title = link?.title ? `${link.title} · SettleX` : 'Pay · SettleX'
  const description = link?.description
    ?? `Pay ${link ? Number(link.amount).toFixed(2) + ' USDC' : ''} via SettleX — pay with any Solana token, settled instantly in USDC.`

  return { title, description, openGraph: { title, description } }
}
