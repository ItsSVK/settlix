'use client'
import { useAuth } from '@/components/auth/auth-context'
import { Button } from '../ui/button'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

export const LogoutButton = ({ className }: { className?: string }) => {
  const { logout, isLoading } = useAuth()

  return (
    <Button
      onClick={logout}
      disabled={isLoading}
      className={cn(
        'relative inline-flex items-center gap-2 rounded-xl bg-background px-3 py-2 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-accent hover:text-foreground',
        'disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer',
        className,
      )}
    >
      <LogOut className='h-4 w-4' />
      <span className='hidden md:block'>Logout</span>
    </Button>
  )
}
