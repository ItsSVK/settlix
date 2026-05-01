'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api/client'

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
      const data = await apiClient.get<{ invoices: Invoice[] }>('/api/invoices')
      return data.invoices
    },
  })

  const sendMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/invoices/${id}/send`, {}),
    onSuccess: () => {
      toast.success('Invoice sent to client')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to send invoice')
    },
  })

  const archiveMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/invoices/${id}`),
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

  return {
    invoices,
    isLoading,
    refresh: refetch,
    archiveInvoice: async (id: string) => { await archiveMutation.mutateAsync(id) },
    sendInvoice: async (id: string) => { await sendMutation.mutateAsync(id) },
    isSending: sendMutation.isPending,
  }
}
