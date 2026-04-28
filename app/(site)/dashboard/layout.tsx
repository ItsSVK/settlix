import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/auth/session'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { DashboardTopbar } from '@/components/dashboard/dashboard-topbar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('settlix_session')?.value
  const session = token ? await verifySession(token) : null

  if (!session) {
    redirect('/')
  }

  const sidebarOpen = cookieStore.get('sidebar_state')?.value !== 'false'

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <AppSidebar />
        <SidebarInset>
          <DashboardTopbar />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
