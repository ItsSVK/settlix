'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

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

  return (
    <header className='sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border/40 bg-background/90 px-4 backdrop-blur-sm'>
      <SidebarTrigger className='-ml-1' />
      {/* <Separator orientation='vertical' className='mr-2 h-4' /> */}
      <Breadcrumb>
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
    </header>
  )
}
