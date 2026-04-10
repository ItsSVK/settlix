import { getPaymentLinkById } from '@/lib/services/payment-link.service'
import { PaymentLink } from '../generated/prisma/client'

export async function getPaymentLinkByDetails(id: string): Promise<PaymentLink> {
  const pay = await getPaymentLinkById(id)
  if (!pay) {
    throw new Error('Payment link not found')
  }
  if (pay.active === false) {
    throw new Error('Payment link is not active')
  }
  return pay
}
