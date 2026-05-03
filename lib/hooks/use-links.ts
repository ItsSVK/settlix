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

  const { mutateAsync: toggleLinkActive, isPending: toggleLinkActivePending } = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => apiClient.patch(`/api/links/${id}`, { active }),
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

  const { mutateAsync: archiveLink, isPending: archiveLinkPending } = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/links/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['links'] })
      const previousLinks = queryClient.getQueryData<Link[]>(['links'])
      if (previousLinks) {
        queryClient.setQueryData<Link[]>(['links'], (old) => old?.filter((link) => link.id !== id))
      }
      return { previousLinks }
    },
    onError: (err, _id, context) => {
      toast.error(err instanceof Error ? err.message : 'Failed to archive link')
      if (context?.previousLinks) {
        queryClient.setQueryData(['links'], context.previousLinks)
      }
    },
    onSuccess: () => {
      toast.success('Link has been archived.')
      queryClient.invalidateQueries({ queryKey: ['links'] })
    },
  })

  return {
    links,
    isLoading,
    refresh: refetch,
    toggleLinkActive,
    toggleLinkActivePending,
    archiveLink,
    archiveLinkPending,
  }
}

export type { Link }
