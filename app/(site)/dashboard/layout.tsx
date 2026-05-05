import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/auth/session'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { DashboardTopbar } from '@/components/dashboard/dashboard-topbar'
import { MobileBottomNav } from '@/components/dashboard/mobile-bottom-nav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('settlix_session')?.value
  const session = token ? await verifySession(token) : null

  if (!session) {
    redirect('/auth')
  }

  const sidebarOpen = cookieStore.get('sidebar_state')?.value !== 'false'

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <AppSidebar />
        <SidebarInset>
          <DashboardTopbar />
          <div className='pb-20 md:pb-0'>{children}</div>
        </SidebarInset>
        <MobileBottomNav />
      </SidebarProvider>
    </TooltipProvider>
  )
}
