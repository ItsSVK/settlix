import type { Metadata } from 'next'
import { HeroSection } from '@/components/landing/hero-section'
import { FlowSection } from '@/components/landing/flow-section'
import { SendShowcaseSection } from '@/components/landing/send-showcase-section'
import { FaqSection } from '@/components/landing/faq-section'

export const metadata: Metadata = {
  alternates: { canonical: 'https://settlix.itssvk.dev' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Settlix',
  url: 'https://settlix.itssvk.dev',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  description:
    'Non-custodial Solana payments platform. Accept any SPL token — SOL, BONK, or others — and receive USDC instantly. Create payment links, invoices, subscriptions, and embed a checkout with one script tag.',
  featureList: [
    'Shareable Payment Links',
    'Crypto Invoicing',
    'Recurring Crypto Subscriptions',
    'Embeddable Checkout Script',
    'Headless REST API',
    'Non-custodial USDC Settlement',
    'Any SPL Token Acceptance via Jupiter',
  ],
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  author: {
    '@type': 'Person',
    name: 'Shouvik Mohanta',
    url: 'https://x.com/ShouvikMohanta',
  },
  keywords:
    'Solana payments, crypto payment links, accept any token, USDC settlement, non-custodial, crypto invoicing, crypto subscriptions, Solana checkout, SPL token payments',
}

export default function LandingPage() {
  return (
    <>
      <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className='flex flex-col'>
        <HeroSection />
        <FlowSection />
        <SendShowcaseSection />
        <FaqSection />
      </main>
    </>
  )
}
