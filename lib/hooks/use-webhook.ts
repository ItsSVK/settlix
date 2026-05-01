'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { MerchantModel } from '@/lib/generated/prisma/models'
import { apiClient } from '@/lib/api/client'

export type Webhook = Pick<MerchantModel, 'webhookSecret' | 'webhookUrl'>
export type WebhookResponse = {
  webhookUrl: string | null
  hasWebhookSecret: boolean
}

export function useWebhook() {
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['webhook-config'],
    queryFn: () => apiClient.get<WebhookResponse>('/api/webhook'),
  })

  const toggleMutation = useMutation({
    mutationFn: (data: Webhook) => apiClient.patch('/api/webhook', data),
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
