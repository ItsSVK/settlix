import { SolanaWalletProvider } from '@/components/providers/wallet-provider'

export default function EmbedTestLayout({ children }: { children: React.ReactNode }) {
  return (
    <SolanaWalletProvider>
      <div className='min-h-screen bg-background'>{children}</div>
    </SolanaWalletProvider>
  )
}
