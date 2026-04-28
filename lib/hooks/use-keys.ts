'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface ApiKey {
  id: string
  name: string
  lastUsedAt: string | null
  createdAt: string
}

export function useKeys() {
  const queryClient = useQueryClient()

  const { data: keys = [], isLoading, refetch } = useQuery({
    queryKey: ['keys'],
    queryFn: async () => {
      const res = await fetch('/api/keys', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch API keys')
      const data = await res.json() as { keys: ApiKey[] }
      return data.keys
    },
  })

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/keys/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to revoke key')
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['keys'] })
      const previousKeys = queryClient.getQueryData<ApiKey[]>(['keys'])
      
      if (previousKeys) {
        queryClient.setQueryData<ApiKey[]>(['keys'], (old) => 
          old?.filter((key) => key.id !== id)
        )
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
    revokeKey: (id: string) => revokeMutation.mutateAsync(id) 
  }
}
