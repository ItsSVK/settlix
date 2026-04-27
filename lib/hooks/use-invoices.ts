'use client'

import { useState, useEffect, useCallback } from 'react'

export interface InvoiceItem {
  id: string
  description: string
  quantity: string
  unitPrice: string
}

export interface Invoice {
  id: string
  clientName: string | null
  clientEmail: string | null
  dueDate: string | null
  memo: string | null
  token: string
  amount: string
  linkId: string
  status: 'paid' | 'overdue' | 'unpaid'
  paidAt: string | null
  txSignature: string | null
  createdAt: string
  lineItems: InvoiceItem[]
}

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/invoice', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json() as { invoices: Invoice[] }
      setInvoices(data.invoices)
    } catch {
      // silently fail
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  return { invoices, isLoading, refresh: load }
}
