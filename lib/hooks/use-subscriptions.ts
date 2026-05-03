'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api/client'

export interface MerchantSubscription {
  id: string
  planId: string
  subscriberWallet: string
  status: 'active' | 'past_due' | 'cancelled'
  currentPeriodEnd: string
  cancelledAt: string | null
  createdAt: string
  plan: {
    title: string | null
    amount: string
    token: string
    interval: string | null
  }
  lastRenewal: {
    status: string
    txSignature: string | null
    executedAt: string | null
  } | null
}

export function useSubscriptions() {
  const queryClient = useQueryClient()

  const {
    data: subscriptions = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const data = await apiClient.get<{ subscriptions: MerchantSubscription[] }>('/api/subscriptions')
      return data.subscriptions
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/subscriptions/${id}/cancel`, {}),
    onSuccess: () => {
      toast.success('Subscription cancelled')
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel subscription')
    },
  })

  return {
    subscriptions,
    isLoading,
    refresh: refetch,
    cancelSubscription: async (id: string) => { await cancelMutation.mutateAsync(id) },
  }
}

export type { MerchantSubscription as Subscription }
