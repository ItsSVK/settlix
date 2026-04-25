'use client'

import { useState, useEffect } from 'react'

interface PaymentLinkData {
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
  const [data, setData] = useState<PaymentLinkData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/link/${id}`)
      .then(async (res) => {
        if (res.status === 410) {
          const body = await res.json().catch(() => ({}))
          throw new Error((body?.code as string | undefined) ?? 'LINK_UNAVAILABLE')
        }
        if (!res.ok) throw new Error('LINK_UNAVAILABLE')
        return res.json()
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'LINK_UNAVAILABLE'))
      .finally(() => setIsLoading(false))
  }, [id])

  return { data, isLoading, error }
}

export type { PaymentLinkData }
