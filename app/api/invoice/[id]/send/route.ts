import { type NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

import { ApiError, handleApi } from '@/lib/api/errors'
import { NOT_FOUND } from '@/lib/api/constants'
import { requireAuth } from '@/lib/auth/require-auth'
import { getInvoiceById } from '@/lib/services/invoice.service'
import { getResendApiKey } from '@/lib/env/server'
import { getSymbolByMint } from '@/lib/tokens/tokens'
import { buildInvoiceEmailHtml, buildInvoiceEmailSubject, type InvoiceEmailData } from '@/lib/email/invoice-email'

type Params = { params: Promise<{ id: string }> }

/** POST /api/invoice/[id]/send — sends the invoice to the client's email */
export async function POST(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const { wallet } = await requireAuth(req)
    const { id } = await params

    const invoice = await getInvoiceById(id)
    if (!invoice) throw new ApiError(404, 'Invoice not found', NOT_FOUND)
    if (invoice.merchantWallet !== wallet) throw new ApiError(403, 'Forbidden', 'FORBIDDEN')
    if (!invoice.clientEmail) {
      return NextResponse.json({ error: 'Invoice has no client email' }, { status: 400 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
    const invoiceUrl = `${siteUrl}/invoice/${id}`

    const tokenSymbol = getSymbolByMint(invoice.token) ?? invoice.token

    const emailData: InvoiceEmailData = {
      invoiceId: id,
      clientName: invoice.clientName,
      clientEmail: invoice.clientEmail,
      amount: invoice.link.amount.toString(),
      tokenSymbol,
      dueDate: invoice.dueDate?.toISOString() ?? null,
      memo: invoice.memo,
      lineItems: invoice.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
      })),
      invoiceUrl,
      merchantWallet: wallet,
    }

    const resend = new Resend(getResendApiKey())

    const { error } = await resend.emails.send({
      from: 'Settlix <invoices@settlix.itssvk.dev>',
      to: invoice.clientEmail,
      subject: buildInvoiceEmailSubject(emailData),
      html: buildInvoiceEmailHtml(emailData),
    })

    if (error) {
      return NextResponse.json({ error: 'Failed to send email', detail: error.message }, { status: 502 })
    }

    return NextResponse.json({ sent: true })
  })
}
