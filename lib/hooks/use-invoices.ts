'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

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
  const queryClient = useQueryClient()

  const {
    data: invoices = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const res = await fetch('/api/invoice', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch invoices')
      const data = (await res.json()) as { invoices: Invoice[] }
      return data.invoices
    },
  })

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/invoice/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to archive invoice')
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['invoices'] })
      const previousInvoices = queryClient.getQueryData<Invoice[]>(['invoices'])

      if (previousInvoices) {
        queryClient.setQueryData<Invoice[]>(['invoices'], (old) => old?.filter((invoice) => invoice.id !== id))
      }
      return { previousInvoices }
    },
    onError: (err, variables, context) => {
      toast.error(err instanceof Error ? err.message : 'Failed to archive invoice')
      if (context?.previousInvoices) {
        queryClient.setQueryData(['invoices'], context.previousInvoices)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })

  return { invoices, isLoading, refresh: refetch, archiveInvoice: (id: string) => archiveMutation.mutateAsync(id) }
}
