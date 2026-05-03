import { getPaymentLinkById } from '@/lib/services/payment-link.service'
import { getInvoiceById } from '@/lib/services/invoice.service'

// Return the inferred type so callers can access included relations (e.g. merchant.wallet).
export async function getPaymentLinkByDetails(id: string) {
  const pay = await getPaymentLinkById(id)
  if (!pay) throw new Error('Payment link not found')
  if (!pay.active) throw new Error('Payment link is not active')
  return pay
}

export async function getInvoicePayDetails(invoiceId: string) {
  const inv = await getInvoiceById(invoiceId)
  if (!inv) throw new Error('Invoice not found')
  return {
    amount: inv.amount,
    token: inv.token,
    merchant: { wallet: inv.merchant.wallet },
  }
}
