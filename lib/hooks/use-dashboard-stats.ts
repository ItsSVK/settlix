'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'

export interface RevenueDay {
  date: string
  total: number
}

export interface TopLink {
  id: string
  title: string | null
  volume: number
  paidCount: number
}

export interface RecentTransaction {
  id: string
  userWallet: string
  amount: number
  linkTitle: string | null
  txSignature: string
  createdAt: string
}

export interface InvoiceStats {
  paid: number
  unpaid: number
  overdue: number
}

export interface SubscriptionStats {
  active: number
  past_due: number
  cancelled: number
}

export interface DashboardStats {
  totalRevenue: number
  activeLinksCount: number
  totalTransactions: number
  overallSuccessRate: number | null
  revenueByDay: RevenueDay[]
  topLinks: TopLink[]
  recentTransactions: RecentTransaction[]
  invoiceStats: InvoiceStats
  subscriptionStats: SubscriptionStats
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiClient.get<DashboardStats>('/api/dashboard/stats'),
    staleTime: 30_000,
  })
}
