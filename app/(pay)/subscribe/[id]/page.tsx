import { getSubscriptionPlanById } from '@/lib/services/subscription.service'
import { getTokenByMint } from '@/lib/tokens/tokens'
import { SubscribeCard, type PlanData } from '@/components/pay/subscribe-card'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SubscribePage({ params }: Props) {
  const { id } = await params
  const plan = await getSubscriptionPlanById(id).catch(() => null)

  if (!plan) {
    return <SubscribeCard plan={null} />
  }

  const tokenEntry = getTokenByMint(plan.token)

  const data: PlanData = {
    id: plan.id,
    merchantWallet: plan.merchant.wallet,
    title: plan.title ?? null,
    description: plan.description ?? null,
    amount: plan.amount.toString(),
    token: plan.token,
    tokenSymbol: tokenEntry?.symbol ?? plan.token.slice(0, 6),
    tokenLogo: tokenEntry?.logoURI ?? null,
    interval: plan.interval,
    active: plan.active,
  }

  return <SubscribeCard plan={data} />
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const plan = await getSubscriptionPlanById(id).catch(() => null)
  const title = plan?.title ? `${plan.title} · Settlix` : 'Subscribe · Settlix'
  const description = plan
    ? `Subscribe for ${Number(plan.amount).toFixed(2)} ${plan.token.slice(0, 6)} / ${plan.interval} via Settlix.`
    : 'Recurring subscription via Settlix.'
  return { title, description, openGraph: { title, description } }
}
