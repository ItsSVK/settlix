import { Trash2Icon, Loader2 } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface ConfirmationModalProps {
  className?: string
  handleArchive: (id: string) => Promise<void> | void
  archiving: string | null
  item: { id: string }
  type: string
  confirmArchive: string | null
  setConfirmArchive: (id: string | null) => void
}

export function ConfirmationModal({
  className,
  handleArchive,
  archiving,
  item,
  type,
  confirmArchive,
  setConfirmArchive,
}: ConfirmationModalProps) {
  const isConfirming = confirmArchive === item.id

  return (
    <AlertDialog open={isConfirming} onOpenChange={(open) => {
      if (!open && archiving === item.id) return
      setConfirmArchive(open ? item.id : null)
    }}>
      <AlertDialogTrigger asChild>
        <Button variant='ghost' size='sm' className={className}>
          <Trash2Icon />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size='sm' onEscapeKeyDown={(e) => { if (archiving === item.id) e.preventDefault() }}>
        <AlertDialogHeader>
          <AlertDialogMedia className='bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive'>
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>{type} Record?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to <span className='font-semibold text-red-500'>{type}</span> this record? This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant='outline'>Cancel</AlertDialogCancel>
          <Button
            variant='destructive'
            onClick={() => void handleArchive(item.id)}
            disabled={archiving === item.id}
          >
            {archiving === item.id ? <Loader2 className='h-4 w-4 animate-spin' /> : type}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
