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
  renewals: {
    id: string
    status: string
    dueAt: string
    executedAt: string | null
    amount: string
    token: string
    txSignature: string | null
    outputAmount: string | null
    executionStatus: string | null
  }[]
}

export interface SubscriptionPlan {
  id: string
  token: string
  amount: string
  interval: string
  title: string | null
  description: string | null
  active: boolean
  createdAt: string
  activeSubscribers: number
}

export function useSubscriptions() {
  const queryClient = useQueryClient()

  const {
    data: subscriptions = [],
    isLoading,
    error,
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
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel subscription')
    },
  })

  return {
    subscriptions,
    isLoading,
    error,
    refresh: refetch,
    cancelSubscription: async (id: string) => { await cancelMutation.mutateAsync(id) },
  }
}

export function useSubscriptionPlans() {
  const {
    data: plans = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const data = await apiClient.get<{ plans: SubscriptionPlan[] }>('/api/subscription-plans')
      return data.plans
    },
  })

  return {
    plans,
    isLoading,
    error,
    refresh: refetch,
  }
}

export type { MerchantSubscription as Subscription }
