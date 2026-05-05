import { SolanaWalletProvider } from '@/components/providers/wallet-provider'

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <SolanaWalletProvider>
      <div className='bg-background p-5'>{children}</div>
    </SolanaWalletProvider>
  )
}
