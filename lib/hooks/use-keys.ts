'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api/client'

export interface ApiKey {
  id: string
  name: string
  lastUsedAt: string | null
  createdAt: string
}

export function useKeys() {
  const queryClient = useQueryClient()

  const {
    data: keys = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['keys'],
    queryFn: async () => {
      const data = await apiClient.get<{ keys: ApiKey[] }>('/api/keys')
      return data.keys
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/keys/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['keys'] })
      const previousKeys = queryClient.getQueryData<ApiKey[]>(['keys'])

      if (previousKeys) {
        queryClient.setQueryData<ApiKey[]>(['keys'], (old) => old?.filter((key) => key.id !== id))
      }
      return { previousKeys }
    },
    onError: (err, variables, context) => {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke key')
      if (context?.previousKeys) {
        queryClient.setQueryData(['keys'], context.previousKeys)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys'] })
    },
  })

  return {
    keys,
    isLoading,
    refresh: refetch,
    revokeKey: async (id: string) => {
      await revokeMutation.mutateAsync(id)
    },
  }
}
