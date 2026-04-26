import { SolanaWalletProvider } from '@/components/providers/wallet-provider'

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <SolanaWalletProvider>
      <div className='flex min-h-screen flex-col bg-background'>{children}</div>
    </SolanaWalletProvider>
  )
}
