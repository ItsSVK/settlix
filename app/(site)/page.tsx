import { HeroSection } from '@/components/landing/hero-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { HowItWorks } from '@/components/landing/how-it-works'

export default function LandingPage() {
  return (
    <main className='flex flex-col'>
      <HeroSection />
      <FeaturesSection />
      <HowItWorks />
    </main>
  )
}
