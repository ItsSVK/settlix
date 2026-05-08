import type { Metadata } from 'next'
import { Geist_Mono, Inter } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import { FloatingThemeToggle } from '@/components/shared/floating-theme-toggle'
import { Providers } from './providers'
import { Analytics } from '@vercel/analytics/next'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const fontMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

const BASE_URL = 'https://settlix.itssvk.dev'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: 'Settlix — Accept Any Token. Receive USDC.',
    template: '%s | Settlix',
  },

  description:
    'Settlix is a non-custodial Solana payments platform. Accept SOL, BONK, or any SPL token — your buyers pay in any token, you always receive USDC. Create payment links, invoices, subscriptions, and embed a one-line checkout on any site.',

  keywords: [
    'Solana payments',
    'crypto payment links',
    'accept crypto payments',
    'non-custodial crypto payments',
    'USDC settlement',
    'accept any token Solana',
    'Solana payment gateway',
    'crypto invoicing',
    'crypto subscriptions',
    'Solana checkout',
    'SPL token payments',
    'Jupiter swap payments',
    'Solana payment API',
    'BONK payments USDC',
    'SOL payments USDC',
    'crypto payment platform',
    'headless crypto payments',
    'embeddable crypto checkout',
  ],

  authors: [{ name: 'Shouvik Mohanta', url: 'https://x.com/ShouvikMohanta' }],
  creator: 'Shouvik Mohanta',
  publisher: 'Settlix',
  category: 'Finance',

  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'Settlix',
    title: 'Settlix — Accept Any Token. Receive USDC.',
    description:
      'Non-custodial Solana payments. Create payment links, invoices, subscriptions, and embed a checkout — your buyers pay in any token, you always receive USDC.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Settlix — Accept any token. Receive USDC.' }],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Settlix — Accept Any Token. Receive USDC.',
    description:
      'Non-custodial Solana payments. Accept SOL, BONK, or any SPL token. You always receive USDC. Payment links, invoices, subscriptions, checkout.',
    images: ['/opengraph-image'],
    creator: '@ShouvikMohanta',
    site: '@ShouvikMohanta',
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  icons: {
    icon: [{ url: '/favicon.ico', sizes: 'any' }, { url: '/logo.svg', type: 'image/svg+xml' }],
    apple: '/apple-icon.png',
  },

  alternates: {
    canonical: BASE_URL,
  },
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
          <Providers>
            <FloatingThemeToggle />
            <div className='flex min-h-screen flex-col bg-background'>{children}</div>
            <Toaster richColors position='bottom-right' />
          </Providers>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
