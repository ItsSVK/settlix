import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/auth/session'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('settlix_session')?.value
  const session = token ? await verifySession(token) : null

  if (!session) {
    redirect('/')
  }

  return <>{children}</>
}
