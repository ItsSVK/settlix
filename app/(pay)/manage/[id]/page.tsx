import { getSubscriberById } from '@/lib/services/subscription.service'
import { getTokenByMint } from '@/lib/tokens/tokens'
import { ManageSubscriptionCard, type ManagedSubscription } from '@/components/pay/manage-subscription-card'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ManageSubscriptionPage({ params }: Props) {
  const { id } = await params
  const sub = await getSubscriberById(id).catch(() => null)

  if (!sub) {
    return <ManageSubscriptionCard subscription={null} />
  }

  const tokenEntry = getTokenByMint(sub.plan.token)

  const data: ManagedSubscription = {
    id: sub.id,
    subscriberWallet: sub.subscriberWallet,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
    cancelledAt: sub.cancelledAt?.toISOString() ?? null,
    createdAt: sub.createdAt.toISOString(),
    plan: {
      title: sub.plan.title ?? null,
      amount: sub.plan.amount.toString(),
      token: sub.plan.token,
      tokenSymbol: tokenEntry?.symbol ?? sub.plan.token.slice(0, 6),
      tokenLogo: tokenEntry?.logoURI ?? null,
      interval: sub.plan.interval,
      merchantWallet: sub.plan.merchant.wallet,
    },
    renewals: sub.renewals.map((r) => ({
      id: r.id,
      status: r.status,
      txSignature: r.execution?.txSignature ?? null,
      dueAt: r.dueAt.toISOString(),
      executedAt: r.executedAt?.toISOString() ?? null,
    })),
  }

  return <ManageSubscriptionCard subscription={data} />
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const sub = await getSubscriberById(id).catch(() => null)
  const title = sub?.plan.title ? `Manage · ${sub.plan.title} · Settlix` : 'Manage Subscription · Settlix'
  return { title }
}
