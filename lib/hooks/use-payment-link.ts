'use client'

import { useQuery } from '@tanstack/react-query'

export interface PaymentLinkData {
  id: string
  merchantWallet: string
  token: string
  amount: string
  type: string
  title: string | null
  description: string | null
  createdAt: string
}

export function usePaymentLink(id: string) {
  const {
    data = null,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['payment-link', id],
    queryFn: async () => {
      const res = await fetch(`/api/links/${id}`)
      if (res.status === 410) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body?.code as string | undefined) ?? 'LINK_UNAVAILABLE')
      }
      if (!res.ok) throw new Error('LINK_UNAVAILABLE')
      return res.json() as Promise<PaymentLinkData>
    },
    retry: false,
  })

  return {
    data,
    isLoading,
    error: error instanceof Error ? error.message : null,
  }
}
