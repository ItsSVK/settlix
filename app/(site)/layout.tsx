import { AuthProvider } from '@/components/auth/auth-context'
import { SolanaWalletProvider } from '@/components/providers/wallet-provider'
import { ConditionalSiteChrome } from '@/components/shared/conditional-site-chrome'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <SolanaWalletProvider>
      <AuthProvider>
        <ConditionalSiteChrome>{children}</ConditionalSiteChrome>
      </AuthProvider>
    </SolanaWalletProvider>
  )
}
