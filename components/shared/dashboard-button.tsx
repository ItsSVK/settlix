'use client'
import { useRouter } from 'next/navigation'
import { Button } from '../ui/button'
import { LayoutDashboard } from 'lucide-react'

export const DashboardButton = () => {
  const router = useRouter()

  return (
    <Button
      className='relative inline-flex md:min-w-25 items-center gap-2 rounded-xl bg-background px-3 py-2 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-accent hover:text-foreground'
      onClick={() => router.push('/dashboard')}
    >
      <LayoutDashboard className='h-4 w-4' />
      <span className='hidden md:block'>Dashboard</span>
    </Button>
  )
}
