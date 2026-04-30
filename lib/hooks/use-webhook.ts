'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { MerchantModel } from '@/lib/generated/prisma/models'

export type Webhook = Pick<MerchantModel, 'webhookSecret' | 'webhookUrl'>
export type WebhookResponse = {
  webhookUrl: string | null
  hasWebhookSecret: boolean
}

export function useWebhook() {
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['webhook-config'],
    queryFn: async () => {
      const res = await fetch('/api/webhook', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch webhook')
      const data = (await res.json()) as WebhookResponse
      return data
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async (data: Webhook) => {
      const res = await fetch(`/api/webhook`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update webhook status')
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['webhook-config'] })
      const previousWebhookResponse = queryClient.getQueryData<WebhookResponse>(['webhook-config'])

      if (previousWebhookResponse) {
        queryClient.setQueryData<WebhookResponse>(['webhook-config'], (old) => (old ? { ...old, ...data } : old))
      }
      return { previousWebhookResponse }
    },
    onError: (err, variables, context) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update webhook status')
      if (context?.previousWebhookResponse) {
        queryClient.setQueryData(['webhook-config'], context.previousWebhookResponse)
      }
    },
    onSuccess: () => {
      toast.success('Webhook configuration updated')
      // Ensure background sync with real server state
      queryClient.invalidateQueries({ queryKey: ['webhook-config'] })
    },
  })

  return {
    webhook: data,
    isLoading,
    refetch,
    updateWebhook: (data: Webhook) => toggleMutation.mutateAsync(data),
  }
}
