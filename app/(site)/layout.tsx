import { Footer } from '@/components/landing/footer'
import { AuthProvider } from '@/components/auth/auth-context'
import { SolanaWalletProvider } from '@/components/providers/wallet-provider'
import { Navbar } from '@/components/shared/navbar'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <SolanaWalletProvider>
      <AuthProvider>
        <div className='flex min-h-screen flex-col bg-background'>
          <Navbar />
          <div className='flex flex-1 flex-col'>{children}</div>
          <Footer />
        </div>
      </AuthProvider>
    </SolanaWalletProvider>
  )
}
