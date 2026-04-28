'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface InvoiceItem {
  id: string
  description: string
  quantity: string
  unitPrice: string
}

interface Link {
  id: string
  merchantWallet: string
  token: string
  amount: string
  title?: string
  description?: string
  type: string
  active: boolean
  expiresAt?: string | null
  maxUses?: number | null
  createdAt: string
  recipients: { wallet: string; basisPoints: number }[]
  stats: {
    totalExecutions: number
    paidCount: number
    failedCount: number
    pendingCount: number
    totalVolume: string
    successRate: number | null
  }
  recentExecutions: {
    id: string
    userWallet: string
    inputToken: string
    inputAmount: string
    outputAmount: string
    txSignature: string
    status: string
    createdAt: string
  }[]
}

export function useLinks() {
  const queryClient = useQueryClient()

  const { data: links = [], isLoading, refetch } = useQuery({
    queryKey: ['links'],
    queryFn: async () => {
      const res = await fetch('/api/links', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch links')
      const data = (await res.json()) as { links: Link[] }
      return data.links
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch(`/api/links/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      })
      if (!res.ok) throw new Error('Failed to update link status')
    },
    onMutate: async ({ id, active }) => {
      await queryClient.cancelQueries({ queryKey: ['links'] })
      const previousLinks = queryClient.getQueryData<Link[]>(['links'])
      
      if (previousLinks) {
        queryClient.setQueryData<Link[]>(['links'], (old) => 
          old?.map((link) => (link.id === id ? { ...link, active } : link))
        )
      }
      return { previousLinks }
    },
    onError: (err, variables, context) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update link status')
      if (context?.previousLinks) {
        queryClient.setQueryData(['links'], context.previousLinks)
      }
    },
    onSuccess: (_, variables) => {
      toast.success(variables.active ? 'Link activated' : 'Link deactivated')
      // Ensure background sync with real server state
      queryClient.invalidateQueries({ queryKey: ['links'] })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/links/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to delete link')
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['links'] })
      const previousLinks = queryClient.getQueryData<Link[]>(['links'])
      
      if (previousLinks) {
        queryClient.setQueryData<Link[]>(['links'], (old) => 
          old?.filter((link) => link.id !== id)
        )
      }
      return { previousLinks }
    },
    onError: (err, variables, context) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete link')
      if (context?.previousLinks) {
        queryClient.setQueryData(['links'], context.previousLinks)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] })
    },
  })

  return {
    links,
    isLoading,
    refresh: refetch,
    toggleLinkActive: (id: string, active: boolean) => toggleMutation.mutateAsync({ id, active }),
    archiveLink: (id: string) => archiveMutation.mutateAsync(id),
  }
}

export type { Link }
