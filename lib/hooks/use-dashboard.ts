'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'

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

  const load = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setIsLoading(true)
    try {
      const res = await fetch('/api/dashboard', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load dashboard')
      setData(await res.json())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  const refresh = () => load({ silent: true })

  const toggleLinkActive = async (id: string, active: boolean) => {
    const previousActive = data?.links.find((link) => link.id === id)?.active

    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        links: prev.links.map((link) => (link.id === id ? { ...link, active } : link)),
      }
    })

    try {
      const res = await fetch(`/api/link/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      })
      if (!res.ok) throw new Error('Failed to update link status')
      toast.success(active ? 'Link activated' : 'Link deactivated')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update link status')
      if (typeof previousActive === 'boolean') {
        setData((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            links: prev.links.map((link) => (link.id === id ? { ...link, active: previousActive } : link)),
          }
        })
      }
      throw e
    }
  }

  useEffect(() => {
    load()
  }, [])

  return { data, isLoading, error, refresh, toggleLinkActive }
}

export type { DashboardLink }
