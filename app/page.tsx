import { HeroSection } from '@/components/landing/hero-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Footer } from '@/components/landing/footer'
import { Navbar } from '@/components/shared/navbar'

export default function LandingPage() {
  return (
    <main className='flex flex-col'>
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorks />
      <Footer />
    </main>
  )
}
