import { Resend } from 'resend'

import { apiLogger } from '@/lib/api/logger'
import { getResendApiKey } from '@/lib/env/server'
import { getSymbolByMint, getTokenByMint, TOKENS } from '@/lib/tokens/tokens'
import { rawToHumanAmount } from '@/lib/solana/amount'
import { buildReceiptEmailHtml, buildReceiptEmailSubject, type ReceiptEmailData } from '@/lib/email/invoice-email'
import { getInvoiceByLinkId } from './invoice.service'

/**
 * Sends a payment receipt to the client if the invoice has a clientEmail.
 * Designed to be called fire-and-forget (void) from the payment execution pipeline.
 */
export async function sendInvoiceReceiptIfApplicable(
  linkId: string,
  txSignature: string,
  inputToken: string,
  inputAmount: bigint,
): Promise<void> {
  const invoice = await getInvoiceByLinkId(linkId)
  if (!invoice?.clientEmail) return

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const tokenSymbol = getSymbolByMint(invoice.token) ?? invoice.token

  const inputTokenEntry = getTokenByMint(inputToken)
  const settlementTokenEntry = getTokenByMint(invoice.token)

  const inputTokenSymbol = inputTokenEntry?.symbol ?? null
  const inputAmountHuman = inputTokenEntry ? rawToHumanAmount(inputAmount, inputTokenEntry.decimals) : null

  const outputTokenEntry = settlementTokenEntry
  const outputAmountHuman = invoice.link.amount.toString()

  const emailData: ReceiptEmailData = {
    clientName: invoice.clientName,
    clientEmail: invoice.clientEmail,
    amount: invoice.link.amount.toString(),
    tokenSymbol,
    memo: invoice.memo,
    lineItems: invoice.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
    })),
    invoiceUrl: `${siteUrl}/invoice/${invoice.id}`,
    txSignature,
    merchantWallet: invoice.merchantWallet,
    inputTokenSymbol,
    inputAmount: inputAmountHuman,
    inputTokenLogo: inputTokenEntry?.logoURI ?? null,
    outputAmount: outputAmountHuman,
    outputTokenSymbol: outputTokenEntry?.symbol ?? null,
    outputTokenLogo: outputTokenEntry?.logoURI ?? null,
  }

  try {
    const resend = new Resend(getResendApiKey())
    const { error } = await resend.emails.send({
      from: 'Settlix <settlix@settlix.itssvk.dev>',
      to: invoice.clientEmail,
      subject: buildReceiptEmailSubject(emailData),
      html: buildReceiptEmailHtml(emailData),
    })

    if (error) {
      apiLogger.warn('Invoice receipt email failed', { invoiceId: invoice.id, linkId, error: error.message })
    } else {
      apiLogger.info('Invoice receipt email sent', { invoiceId: invoice.id, to: invoice.clientEmail })
    }
  } catch (e) {
    apiLogger.warn('Invoice receipt email threw', { invoiceId: invoice.id, linkId, error: e })
  }
}
