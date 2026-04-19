import type { Metadata } from 'next'
import { Geist_Mono, Inter } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import { FloatingThemeToggle } from '@/components/shared/floating-theme-toggle'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const fontMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'Settlix — Solana Payment Links',
  description: 'Create shareable Solana payment links. Buyers pay in any token; you receive USDC. Non-custodial.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang='en'
      suppressHydrationWarning
      className={cn('h-full antialiased', fontMono.variable, inter.variable, 'font-sans')}
    >
      <body className='flex min-h-full flex-col bg-background text-foreground no-scrollbar overflow-x-hidden'>
        <ThemeProvider attribute='class' defaultTheme='dark' enableSystem disableTransitionOnChange>
          <FloatingThemeToggle />
          <div className='flex min-h-screen flex-col bg-background'>{children}</div>
          <Toaster richColors position='bottom-right' />
        </ThemeProvider>
      </body>
    </html>
  )
}
