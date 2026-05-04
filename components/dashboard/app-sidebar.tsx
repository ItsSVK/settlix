'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  LayoutDashboard,
  FileText,
  KeyRound,
  Webhook,
  LogOut,
  Sun,
  Moon,
  Copy,
  Check,
  BookOpen,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/components/auth/auth-context'
import { useTheme } from 'next-themes'
import { copyText } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { DollarSign } from 'lucide-react'

const navItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    hoverAnim: 'group-hover/nav-item:scale-110 group-hover/nav-item:-rotate-6',
  },
  {
    title: 'Payment Links',
    href: '/dashboard/links',
    icon: DollarSign,
    hoverAnim: 'group-hover/nav-item:-translate-y-1 group-hover/nav-item:rotate-6 group-hover/nav-item:scale-110',
  },
  {
    title: 'Invoices',
    href: '/dashboard/invoices',
    icon: FileText,
    hoverAnim: 'group-hover/nav-item:scale-110 group-hover/nav-item:rotate-[10deg]',
  },
  {
    title: 'Subscriptions',
    href: '/dashboard/subscriptions',
    icon: RefreshCw,
    hoverAnim: 'group-hover/nav-item:rotate-180 group-hover/nav-item:scale-110',
  },
  {
    title: 'API Keys',
    href: '/dashboard/keys',
    icon: KeyRound,
    hoverAnim: 'group-hover/nav-item:-rotate-[35deg] group-hover/nav-item:scale-110',
  },
  {
    title: 'Webhook',
    href: '/dashboard/webhook',
    icon: Webhook,
    hoverAnim: 'group-hover/nav-item:scale-125 group-hover/nav-item:rotate-[15deg]',
  },
]

function shorten(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`
}

export function AppSidebar() {
  const pathname = usePathname()
  const { wallet, logout } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()
  const [copied, setCopied] = useState(false)
  const isDark = resolvedTheme === 'dark'
  const { setOpenMobile, isMobile } = useSidebar()

  const handleMobileClose = () => {
    if (isMobile) {
      setTimeout(() => {
        setOpenMobile(false)
      }, 200)
    }
  }

  return (
    <Sidebar
      collapsible='icon'
      className='border-r-0 shadow-[2px_0_16px_rgba(0,0,0,0.03)] dark:shadow-[2px_0_16px_rgba(0,0,0,0.3)] [&>div[data-sidebar=sidebar]]:bg-zinc-50 dark:[&>div[data-sidebar=sidebar]]:bg-zinc-950/50'
    >
      {/* Logo */}
      <SidebarHeader className='px-4 py-6 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:py-4 group-data-[collapsible=icon]:items-center'>
        <Link
          href='/'
          onClick={handleMobileClose}
          className='flex items-center gap-3 px-1 transition-transform hover:scale-[1.02] active:scale-[0.98] group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center'
        >
          <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary/80 text-primary-foreground text-sm font-black shadow-lg shadow-primary/20 ring-1 ring-primary/20'>
            S
          </div>
          <span className='truncate text-xl font-bold tracking-tight group-data-[collapsible=icon]:hidden'>
            Settl<span className='text-primary'>i</span>X
          </span>
        </Link>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        <SidebarGroup className='pt-2 group-data-[collapsible=icon]:p-0'>
          <SidebarGroupContent>
            <SidebarMenu className='gap-2.5 px-3 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:items-center'>
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <SidebarMenuItem key={item.href} className='w-full'>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={`relative h-11 w-full overflow-hidden rounded-xl px-3 transition-all duration-300 ease-out group/nav-item group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center ${
                        isActive
                          ? 'bg-primary! text-primary-foreground! font-medium shadow-md shadow-primary/20'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:translate-x-1 group-data-[collapsible=icon]:hover:translate-x-0'
                      }`}
                    >
                      <Link
                        href={item.href}
                        onClick={handleMobileClose}
                        className='flex items-center gap-3 w-full group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:justify-center'
                      >
                        <item.icon
                          className={`h-5 w-5 shrink-0 transition-all duration-300 ease-out ${
                            isActive ? 'scale-110' : `group-hover/nav-item:text-primary ${item.hoverAnim}`
                          }`}
                        />
                        <span className='text-sm tracking-wide group-data-[collapsible=icon]:hidden'>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className='px-4 pb-6 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:pb-4 group-data-[collapsible=icon]:items-center'>
        <SidebarMenu className='gap-1 bg-muted/20 p-2 rounded-2xl border border-border/30 backdrop-blur-sm shadow-sm group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:border-none group-data-[collapsible=icon]:shadow-none group-data-[collapsible=icon]:p-0'>
          {/* Wallet address */}
          {wallet && (
            <SidebarMenuItem className='w-full'>
              <SidebarMenuButton
                onClick={() => {
                  copyText(wallet, setCopied)
                  handleMobileClose()
                }}
                tooltip={wallet}
                className='h-10 w-full rounded-xl font-mono text-xs text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm transition-all duration-200 group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center'
              >
                <span className='h-2 w-2 shrink-0 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] group-data-[collapsible=icon]:m-0' />
                <span className='flex-1 truncate tracking-wider group-data-[collapsible=icon]:hidden'>
                  {shorten(wallet)}
                </span>
                {copied ? (
                  <Check className='ml-auto h-3.5 w-3.5 text-green-500 group-data-[collapsible=icon]:hidden' />
                ) : (
                  <Copy className='ml-auto h-3.5 w-3.5 opacity-50 group-data-[collapsible=icon]:hidden' />
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {wallet && <div className='mx-2 my-1 h-px bg-border/50 group-data-[collapsible=icon]:hidden' />}

          {/* Theme toggle */}
          <SidebarMenuItem className='w-full'>
            <SidebarMenuButton
              onClick={() => {
                setTheme(isDark ? 'light' : 'dark')
                handleMobileClose()
              }}
              tooltip={isDark ? 'Light mode' : 'Dark mode'}
              className='h-10 w-full rounded-xl text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm transition-all duration-200 group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center'
            >
              <span className='group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center w-full group-data-[collapsible=icon]:w-auto'>
                <div className='absolute left-3 grid place-items-center group-data-[collapsible=icon]:static'>
                  <AnimatePresence mode='popLayout' initial={false}>
                    <motion.span
                      key={isDark ? 'sun' : 'moon'}
                      initial={{ opacity: 0, scale: 0.5, rotate: -60 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.5, rotate: 60 }}
                      className='col-start-1 row-start-1 flex items-center justify-center'
                    >
                      {isDark ? <Sun className='h-4 w-4 shrink-0' /> : <Moon className='h-4 w-4 shrink-0' />}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <span className='font-medium tracking-wide ml-7 group-data-[collapsible=icon]:hidden'>
                  {isDark ? 'Light mode' : 'Dark mode'}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Docs */}
          <SidebarMenuItem className='w-full'>
            <SidebarMenuButton
              asChild
              tooltip='Documentation'
              className='h-10 w-full rounded-xl text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm transition-all duration-200 group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center'
            >
              <Link href='/docs' onClick={handleMobileClose} target='_blank'>
                <span className='group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center w-full group-data-[collapsible=icon]:w-auto'>
                  <BookOpen className='h-4 w-4 shrink-0 absolute left-3 group-data-[collapsible=icon]:static' />
                  <span className='font-medium tracking-wide ml-7 group-data-[collapsible=icon]:hidden'>
                    Documentation
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Logout */}
          <SidebarMenuItem className='w-full'>
            <SidebarMenuButton
              onClick={() => {
                logout()
                handleMobileClose()
              }}
              tooltip='Log out'
              className='h-10 w-full rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:shadow-sm transition-all duration-200 group/logout group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center'
            >
              <span className='group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center w-full group-data-[collapsible=icon]:w-auto'>
                <LogOut className='h-4 w-4 shrink-0 absolute left-3 group-data-[collapsible=icon]:static group-hover/logout:translate-x-1 group-data-[collapsible=icon]:group-hover/logout:translate-x-0 transition-transform' />
                <span className='font-medium tracking-wide ml-7 group-data-[collapsible=icon]:hidden'>Log out</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
