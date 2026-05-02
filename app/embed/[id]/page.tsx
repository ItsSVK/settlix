import { notFound } from 'next/navigation'
import { paymentLinkId } from '@/lib/validation'
import { EmbedPayCard } from '@/components/pay/embed-pay-card'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ metadata?: string }>
}

export const metadata = { title: 'Settlix Checkout' }

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
