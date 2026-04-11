'use client'

import { useState, useEffect } from 'react'

interface DashboardLink {
  id: string
  merchantWallet: string
  token: string
  amount: string
  type: string
  active: boolean
  createdAt: string
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

interface DashboardData {
  links: DashboardLink[]
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/dashboard', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load dashboard')
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return { data, isLoading, error, refresh: load }
}

export type { DashboardLink }
