'use client'

import { getNameByMint, getDecimalsByMint } from '@/lib/tokens/tokens'
import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'

interface DashboardLink {
  id: string
  merchantWallet: string
  token: string
  amount: string
  title?: string
  description?: string
  type: string
  active: boolean
  expiresAt?: string | null
  maxUses?: number | null
  createdAt: string
  recipients: { wallet: string; basisPoints: number }[]
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
  const seenPaidExecutionIds = useRef<Set<string>>(new Set<string>())

  const load = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
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
  }, [])

  const refresh = useCallback(() => load({ silent: true }), [load])

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  useEffect(() => {
    const eventSource = new EventSource('/api/dashboard/stream', { withCredentials: true })

    eventSource.onmessage = (message) => {
      try {
        const payload = JSON.parse(message.data) as {
          type?: string
          executionId?: string
          outputAmount?: string
          settlementToken?: string
        }
        if (payload.type !== 'payment_paid' || !payload.executionId) return

        if (seenPaidExecutionIds.current.has(payload.executionId)) return
        seenPaidExecutionIds.current.add(payload.executionId)

        void load({ silent: true })

        const token = payload.settlementToken ?? 'token'
        const amount = Number(payload.outputAmount) / 10 ** getDecimalsByMint(token) || 0
        const amountLabel = Number.isFinite(amount) ? amount.toFixed(2) : payload.outputAmount ?? '0'
        toast.success(`Payment received — ${amountLabel} ${getNameByMint(token)}`)
      } catch {
        // Ignore malformed stream payloads and keep listening.
      }
    }

    eventSource.onerror = () => {
      // EventSource will auto-reconnect. Silently re-fetch so the
      // dashboard isn't stale if a payment landed while disconnected.
      void load({ silent: true })
    }

    return () => {
      eventSource.close()
    }
  }, [load])

  return { data, isLoading, error, refresh, toggleLinkActive }
}

export type { DashboardLink }
