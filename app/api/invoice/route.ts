import { type NextRequest, NextResponse } from 'next/server'

import { handleApi, readJsonBody } from '@/lib/api/errors'
import { requireAuth } from '@/lib/auth/require-auth'
import { isAllowedSettlementMint } from '@/lib/solana/constants'
import { getSolanaCluster } from '@/lib/env/server'
import { VALIDATION } from '@/lib/api/constants'
import { createInvoiceBody } from '@/lib/validation'
import { createInvoice, getInvoicesByWallet, deriveInvoiceStatus } from '@/lib/services/invoice.service'

/** GET /api/invoice — list invoices for the authenticated merchant */
export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const { wallet } = await requireAuth(req)
    const invoices = await getInvoicesByWallet(wallet)

    return NextResponse.json({
      invoices: invoices.map((inv) => {
        const paidExecution = inv.link.executions[0] ?? null
        const status = deriveInvoiceStatus(inv.dueDate, paidExecution?.createdAt ?? null)
        return {
          id: inv.id,
          clientName: inv.clientName,
          clientEmail: inv.clientEmail,
          dueDate: inv.dueDate?.toISOString() ?? null,
          memo: inv.memo,
          token: inv.token,
          amount: inv.link.amount.toString(),
          linkId: inv.link.id,
          status,
          paidAt: paidExecution?.createdAt.toISOString() ?? null,
          txSignature: paidExecution?.txSignature ?? null,
          createdAt: inv.createdAt.toISOString(),
          lineItems: inv.lineItems.map((item) => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity.toString(),
            unitPrice: item.unitPrice.toString(),
          })),
        }
      }),
    })
  })
}

/** POST /api/invoice — create a new invoice */
export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const { wallet } = await requireAuth(req)

    const json = await readJsonBody(req)
    const parsed = createInvoiceBody.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: VALIDATION, issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const cluster = getSolanaCluster()
    if (!isAllowedSettlementMint(parsed.data.token, cluster)) {
      return NextResponse.json({ error: 'Unsupported settlement token', code: 'UNSUPPORTED_TOKEN' }, { status: 400 })
    }

    const invoice = await createInvoice({
      merchantWallet: wallet,
      clientName: parsed.data.clientName,
      clientEmail: parsed.data.clientEmail,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      memo: parsed.data.memo,
      token: parsed.data.token,
      lineItems: parsed.data.lineItems,
    })

    return NextResponse.json(
      {
        id: invoice.id,
        linkId: invoice.linkId,
        invoicePath: `/invoice/${invoice.id}`,
      },
      { status: 201 },
    )
  })
}
