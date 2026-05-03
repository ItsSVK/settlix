'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api/client'

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
  interval?: string | null
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

  const {
    data: links = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['links'],
    queryFn: async () => {
      const data = await apiClient.get<{ links: Link[] }>('/api/links')
      return data.links
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiClient.patch(`/api/links/${id}`, { active }),
    onMutate: async ({ id, active }) => {
      await queryClient.cancelQueries({ queryKey: ['links'] })
      const previousLinks = queryClient.getQueryData<Link[]>(['links'])

      if (previousLinks) {
        queryClient.setQueryData<Link[]>(['links'], (old) =>
          old?.map((link) => (link.id === id ? { ...link, active } : link)),
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
    mutationFn: (id: string) => apiClient.delete(`/api/links/${id}`),
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete link')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] })
    },
  })

  return {
    links,
    isLoading,
    refresh: refetch,
    toggleLinkActive: async (id: string, active: boolean) => { await toggleMutation.mutateAsync({ id, active }) },
    archiveLink: async (id: string) => { await archiveMutation.mutateAsync(id) },
  }
}

export type { Link }
