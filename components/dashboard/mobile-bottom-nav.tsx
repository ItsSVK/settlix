'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, KeyRound, Webhook, DollarSign, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'motion/react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/dashboard/links', icon: DollarSign, label: 'Links' },
  { href: '/dashboard/invoices', icon: FileText, label: 'Invoices' },
  { href: '/dashboard/subscriptions', icon: RefreshCw, label: 'Subs' },
  { href: '/dashboard/keys', icon: KeyRound, label: 'Keys' },
  { href: '/dashboard/webhook', icon: Webhook, label: 'Hooks' },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className='fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-end justify-around border-t border-border/50 bg-background/90 backdrop-blur-xl pb-safe'>
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className='relative flex flex-col items-center justify-center py-2 px-3 min-w-0 flex-1 gap-0.5'
          >
            {isActive && (
              <motion.div
                layoutId='mobile-nav-pill'
                className='absolute inset-x-2 top-1 h-0.5 rounded-full bg-primary'
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <item.icon
              className={cn(
                'h-5 w-5 shrink-0 transition-all duration-200',
                isActive ? 'text-primary scale-110' : 'text-muted-foreground',
              )}
            />
            <span
              className={cn(
                'text-[10px] font-medium transition-all duration-200 truncate',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
