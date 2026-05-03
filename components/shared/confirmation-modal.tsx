'use client'

import { useState } from 'react'
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
  /** Called when the user confirms. Receives the item id. */
  onConfirm: (id: string) => Promise<unknown>
  /** Whether the async action is currently in-flight. */
  isPending: boolean
  id: string
  /** Label shown in the dialog title and confirm button, e.g. "Archive" or "Delete". */
  type: string
}

export function ConfirmationModal({ className, onConfirm, isPending, id, type }: ConfirmationModalProps) {
  const [open, setOpen] = useState(false)

  const handleConfirm = async () => {
    await onConfirm(id)
    setOpen(false)
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // Prevent closing while the action is in-flight
        if (!next && isPending) return
        setOpen(next)
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant='ghost' size='sm' className={className}>
          <Trash2Icon />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        size='sm'
        onEscapeKeyDown={(e) => {
          if (isPending) e.preventDefault()
        }}
      >
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
          <Button variant='destructive' onClick={() => void handleConfirm()} disabled={isPending}>
            {isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : type}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
