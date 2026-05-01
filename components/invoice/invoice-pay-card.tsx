'use client'

import { useState } from 'react'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { PayCardBase } from '@/components/pay/pay-card-base'
import { JupiterCallout } from '@/components/pay/jupiter-callout'
import { useRouter } from 'next/navigation'
import { InvoiceReceipt } from './invoice-receipt'
import { InvoiceDetails } from './invoice-details'

export interface InvoiceData {
  id: string
  merchantWallet: string
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
  lineItems: { id: string; description: string; quantity: string; unitPrice: string }[]
  /** Display symbol for the settlement token (e.g. "USDC") */
  tokenSymbol: string
  /** Token mint the client actually paid with */
  inputToken: string | null
  /** Human-readable amount the client paid in their chosen token */
  inputAmount: string | null
  /** Symbol of the token the client paid with */
  inputTokenSymbol: string | null
}

export function InvoicePayCard({ invoice }: { invoice: InvoiceData }) {
  const router = useRouter()
  const [localSuccess, setLocalSuccess] = useState<{
    txSignature: string
    swap?: { inputAmount: string; inputDecimals: number; inputSymbol: string }
    tokenMint?: string
  } | null>(null)

  const handlePaid = (
    txSignature: string,
    details?: { swap?: { inputAmount: string; inputDecimals: number; inputSymbol: string }; tokenMint?: string },
  ) => {
    setLocalSuccess({ txSignature, ...details })
    router.refresh()
  }

  const isPaid = invoice.status === 'paid' || !!localSuccess
  const isOverdue = invoice.status === 'overdue' && !isPaid
  const txSignature = localSuccess?.txSignature || invoice.txSignature

  const displayInputTokenSymbol = localSuccess?.swap?.inputSymbol || invoice.inputTokenSymbol
  const displayInputAmountRaw = localSuccess?.swap
    ? (Number(localSuccess.swap.inputAmount) / Math.pow(10, localSuccess.swap.inputDecimals)).toString()
    : invoice.inputAmount

  const isDirectPayment = localSuccess
    ? !localSuccess.swap
    : invoice.inputToken === invoice.token || !invoice.inputToken
  const finalInputTokenSymbol = isDirectPayment ? invoice.tokenSymbol : displayInputTokenSymbol
  const finalInputAmount = isDirectPayment ? invoice.amount : displayInputAmountRaw
  const finalInputToken = localSuccess?.tokenMint || invoice.inputToken || invoice.token

  if (isPaid && txSignature) {
    return (
      <InvoiceReceipt
        invoice={invoice}
        txSignature={txSignature}
        finalInputAmount={finalInputAmount}
        finalInputTokenSymbol={finalInputTokenSymbol}
        finalInputToken={finalInputToken}
        isDirectPayment={isDirectPayment}
      />
    )
  }

  return (
    <div className='relative flex min-h-screen w-full flex-col items-center bg-background px-4 py-20'>
      <BackgroundBeams className='opacity-30' />
      <div className='relative z-10 w-full flex flex-col items-center gap-5'>
        <InvoiceDetails invoice={invoice} isOverdue={isOverdue} />

        <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
          <JupiterCallout />
          <PayCardBase linkId={invoice.linkId} allowInvoice onPaid={handlePaid} />
        </div>
      </div>
    </div>
  )
}
