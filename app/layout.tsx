import type { Metadata } from 'next'
import { Geist_Mono, Inter } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { ThemeProvider } from '@/components/theme-provider'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'SettleX',
  description: 'SettleX is a non-custodial Solana checkout. Pay in any token; merchants receive USDC.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang='en'
      suppressHydrationWarning
      className={cn('h-full', 'antialiased', fontMono.variable, 'font-sans', inter.variable)}
    >
      <body className='min-h-full flex flex-col'>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
