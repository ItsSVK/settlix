'use client'

import { useState, useEffect } from 'react'

interface PaymentLinkData {
  id: string
  merchantWallet: string
  token: string
  amount: string
  type: string
  createdAt: string
}

export function usePaymentLink(id: string) {
  const [data, setData] = useState<PaymentLinkData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/link/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Link not found or inactive')
        return res.json()
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setIsLoading(false))
  }, [id])

  return { data, isLoading, error }
}

export type { PaymentLinkData }
