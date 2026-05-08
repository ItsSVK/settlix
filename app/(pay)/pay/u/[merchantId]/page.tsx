import { notFound } from 'next/navigation'
import { PersonalPayCard } from '@/components/pay/personal-pay-card'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { JupiterCallout } from '@/components/pay/jupiter-callout'
import { prisma } from '@/lib/db'

interface Props {
  params: Promise<{ merchantId: string }>
}

export async function generateMetadata({ params }: Props) {
  const { merchantId } = await params
  const merchant = await prisma.merchant
    .findUnique({ where: { id: merchantId }, select: { wallet: true } })
    .catch(() => null)
  const short = merchant ? `${merchant.wallet.slice(0, 4)}…${merchant.wallet.slice(-4)}` : 'Merchant'
  return { title: `Pay ${short} · Settlix` }
}

export default async function PersonalPayPage({ params }: Props) {
  const { merchantId } = await params
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { wallet: true },
  })
  if (!merchant) notFound()

  return (
    <div className='relative flex flex-1 w-full items-center justify-center bg-background px-4 py-20'>
      <BackgroundBeams className='opacity-40' />
      <div className='relative z-10 flex w-full max-w-sm flex-col items-center gap-4'>
        <JupiterCallout />
        <PersonalPayCard merchantId={merchantId} merchantWallet={merchant.wallet} />
      </div>
    </div>
  )
}
