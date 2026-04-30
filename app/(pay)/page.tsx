import { HeroSection } from '@/components/landing/hero-section'
import { FlowSection } from '@/components/landing/flow-section'
import { SendShowcaseSection } from '@/components/landing/send-showcase-section'

export default function LandingPage() {
  return (
    <main className='flex flex-col'>
      <HeroSection />
      <FlowSection />
      <SendShowcaseSection />
    </main>
  )
}
