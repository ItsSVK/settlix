'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useTheme } from 'next-themes'
import { SettlixLogoConcise } from '@/components/shared/settlix-logo'
import { useAuth } from '@/components/auth/auth-context'
import { BookOpen, LogOut, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/links': 'Payment Links',
  '/dashboard/invoices': 'Invoices',
  '/dashboard/subscriptions': 'Subscriptions',
  '/dashboard/keys': 'API Keys',
  '/dashboard/webhook': 'Webhook',
}

export function DashboardTopbar() {
  const pathname = usePathname()
  const isRoot = pathname === '/dashboard'
  const label = routeLabels[pathname] ?? 'Page'
  const { resolvedTheme, setTheme } = useTheme()
  const { logout } = useAuth()
  const isDark = resolvedTheme === 'dark'

  return (
    <header className='sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border/40 bg-background/90 px-4 backdrop-blur-sm'>
      <SidebarTrigger className='-ml-1 hidden md:flex' />

      {/* Logo — mobile only, hidden on desktop where sidebar shows it */}
      <Link href='/dashboard' className='group flex md:hidden items-center gap-1.5 mr-auto'>
        <SettlixLogoConcise className='h-6 w-6 transition-transform duration-500 group-hover:rotate-180' />
        <span className='text-base font-bold tracking-tight'>
          Settl<span className='text-primary'>i</span>X
        </span>
      </Link>

      <Breadcrumb className='hidden md:flex flex-1'>
        <BreadcrumbList>
          {isRoot ? (
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          ) : (
            <>
              <BreadcrumbItem className='hidden md:block'>
                <BreadcrumbLink asChild>
                  <Link href='/dashboard'>Dashboard</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className='hidden md:block' />
              <BreadcrumbItem>
                <BreadcrumbPage>{label}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Mobile-only actions — hidden on desktop since sidebar handles these */}
      <div className='flex items-center gap-1 md:hidden'>
        {/* Theme toggle */}
        <Button
          variant='ghost'
          size='icon-sm'
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className='h-8 w-8 text-muted-foreground'
          aria-label='Toggle theme'
        >
          <AnimatePresence mode='popLayout' initial={false}>
            <motion.span
              key={isDark ? 'sun' : 'moon'}
              initial={{ opacity: 0, scale: 0.5, rotate: -60 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, rotate: 60 }}
              className='flex items-center justify-center'
            >
              {isDark ? <Sun className='h-4 w-4' /> : <Moon className='h-4 w-4' />}
            </motion.span>
          </AnimatePresence>
        </Button>

        {/* Docs */}
        <Button
          variant='ghost'
          size='icon-sm'
          asChild
          className='h-8 w-8 text-muted-foreground'
          aria-label='Documentation'
        >
          <Link href='/docs' target='_blank'>
            <BookOpen className='h-4 w-4' />
          </Link>
        </Button>

        {/* Logout */}
        <Button
          variant='ghost'
          size='icon-sm'
          onClick={logout}
          className='h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10'
          aria-label='Log out'
        >
          <LogOut className='h-4 w-4' />
        </Button>
      </div>
    </header>
  )
}
