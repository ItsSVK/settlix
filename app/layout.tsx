import type { Metadata } from 'next'
import { Geist_Mono, Inter } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { ThemeProvider } from '@/components/theme-provider'
import { SolanaWalletProvider } from '@/components/providers/wallet-provider'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const fontMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'SettleX — Solana Payment Links',
  description: 'Create shareable Solana payment links. Buyers pay in any token; you receive USDC. Non-custodial.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang='en'
      suppressHydrationWarning
      className={cn('h-full antialiased', fontMono.variable, inter.variable, 'font-sans')}
    >
      <body className='min-h-full flex flex-col bg-background text-foreground'>
        <ThemeProvider attribute='class' defaultTheme='dark' enableSystem disableTransitionOnChange>
          <SolanaWalletProvider>
            {children}
            <Toaster richColors position='top-right' />
          </SolanaWalletProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
