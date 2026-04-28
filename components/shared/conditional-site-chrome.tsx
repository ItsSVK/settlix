'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/shared/navbar'
import { Footer } from '@/components/landing/footer'

export function ConditionalSiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname.startsWith('/dashboard')) {
    return <>{children}</>
  }

  return (
    <div className='flex min-h-screen flex-col bg-background'>
      <Navbar />
      <div className='flex flex-1 flex-col'>{children}</div>
      <Footer />
    </div>
  )
}
