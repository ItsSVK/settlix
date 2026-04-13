import { notFound } from 'next/navigation'
import { PayCard } from '@/components/pay/pay-card'
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
  return {
    title: `Pay · SettleX`,
    description: `Complete your Solana payment (link ${id})`,
  }
}
