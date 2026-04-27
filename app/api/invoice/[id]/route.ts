import { type NextRequest, NextResponse } from 'next/server'

import { ApiError, handleApi } from '@/lib/api/errors'
import { NOT_FOUND } from '@/lib/api/constants'
import { getInvoiceById, deriveInvoiceStatus } from '@/lib/services/invoice.service'

type Params = { params: Promise<{ id: string }> }

/** GET /api/invoice/[id] — public; used by the invoice pay page */
export async function GET(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params
    const invoice = await getInvoiceById(id)

    if (!invoice) throw new ApiError(404, 'Invoice not found', NOT_FOUND)

    const paidExecution = invoice.link.executions[0] ?? null
    const status = deriveInvoiceStatus(invoice.dueDate, paidExecution?.createdAt ?? null)

    return NextResponse.json({
      id: invoice.id,
      merchantWallet: invoice.merchantWallet,
      clientName: invoice.clientName,
      clientEmail: invoice.clientEmail,
      dueDate: invoice.dueDate?.toISOString() ?? null,
      memo: invoice.memo,
      token: invoice.token,
      amount: invoice.link.amount.toString(),
      linkId: invoice.linkId,
      status,
      paidAt: paidExecution?.createdAt.toISOString() ?? null,
      txSignature: paidExecution?.txSignature ?? null,
      createdAt: invoice.createdAt.toISOString(),
      lineItems: invoice.lineItems.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
      })),
    })
  })
}
