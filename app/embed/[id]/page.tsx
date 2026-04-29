import { notFound } from 'next/navigation'
import { paymentLinkId } from '@/lib/validation'
import { EmbedPayCard } from '@/components/pay/embed-pay-card'
import { getPaymentLinkById } from '@/lib/services/payment-link.service'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ metadata?: string }>
}

export default async function EmbedPage({ params, searchParams }: Props) {
  const { id } = await params
  const parsedId = paymentLinkId.safeParse(id)
  if (!parsedId.success) notFound()

  const { metadata: rawMeta } = await searchParams
  let metadata: Record<string, unknown> | null = null
  if (rawMeta) {
    try {
      metadata = JSON.parse(decodeURIComponent(rawMeta))
    } catch {}
  }

  return <EmbedPayCard linkId={parsedId.data} metadata={metadata} />
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const parsedId = paymentLinkId.safeParse(id)
  if (!parsedId.success) return { title: 'Settlix Checkout' }

  const link = await getPaymentLinkById(parsedId.data).catch(() => null)
  const title = link?.title ? `${link.title} · Settlix` : 'Settlix Checkout'
  return { title }
}
