import { Footer } from '@/components/landing/footer'
import { SolanaWalletProvider } from '@/components/providers/wallet-provider'
import { Navbar } from '@/components/shared/navbar'
import { ScrollToTop } from '@/components/ui/scroll-to-top'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <SolanaWalletProvider>
      <div className='flex min-h-screen flex-col bg-background'>
        <Navbar />
        <main className='flex flex-1 flex-col'>{children}</main>
        <Footer />
        <ScrollToTop />
      </div>
    </SolanaWalletProvider>
  )
}
