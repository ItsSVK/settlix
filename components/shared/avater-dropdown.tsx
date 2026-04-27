import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CodeXml, FileCode, FileText, LayoutDashboard, LogOut, Webhook } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-context'
import { useRouter } from 'next/navigation'

export function AvatarDropdown() {
  const { logout } = useAuth()
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' className='rounded-full'>
          <Avatar>
            <AvatarImage src='https://github.com/shadcn.png' alt='shadcn' />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-40 min-w-0 rounded-xl'>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/dashboard')}>
            <LayoutDashboard className='h-4 w-4' />
            Dashboard
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/dashboard/invoices')}>
            <FileText className='h-4 w-4' />
            Invoices
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/dashboard/keys')}>
            <CodeXml className='h-4 w-4' />
            API Keys
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/dashboard/webhook')}>
            <Webhook className='h-4 w-4' />
            Webhook
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open('/docs', '_blank')}>
            <FileCode className='h-4 w-4' />
            Docs
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant='destructive' onClick={logout}>
            <LogOut className='h-4 w-4' />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
