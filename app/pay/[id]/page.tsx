import { PayCard } from '@/components/pay/pay-card'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PayPage({ params }: Props) {
  const { id } = await params
  return <PayCard linkId={id} />
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  return {
    title: `Pay · SettleX`,
    description: `Complete your Solana payment (link ${id})`,
  }
}
