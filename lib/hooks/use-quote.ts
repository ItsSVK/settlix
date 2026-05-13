'use client'

import { useQuotePoller, REFRESH_INTERVAL_MS } from './use-quote-poller'
export { REFRESH_INTERVAL_MS }

interface QuoteResult {
  inAmount: string
  outAmount: string
  inputMint: string
  outputMint: string
}

/**
 * @param payContext   - { payId } for a payment link, { invoiceId } for an invoice
 * @param inputMint    - mint the buyer wants to pay with (null = token not selected yet)
 * @param outputMint   - settlement mint (used to detect same-mint case)
 *
 * When inputMint === outputMint the rate is permanently 1:1 — polling is skipped entirely.
 * One initial API call is still made to get the confirmed raw amount from the backend.
 */
export function useQuote(
  payContext: { payId: string } | { invoiceId: string },
  inputMint: string | null,
  outputMint: string | null,
  options: { disabled?: boolean } = {},
) {
  const payId = 'payId' in payContext ? payContext.payId : undefined
  const invoiceId = 'invoiceId' in payContext ? payContext.invoiceId : undefined
  const isDirect = !!inputMint && !!outputMint && inputMint === outputMint

  const payload =
    inputMint && (payId || invoiceId)
      ? payId
        ? { inputMint, payId }
        : { inputMint, invoiceId }
      : null

  const { quote, isLoading, isRefreshing, error, refetch } = useQuotePoller<QuoteResult>(
    '/api/checkout/pay/quote',
    payload,
    isDirect,
    options,
  )

  return { quote, isLoading, isRefreshing, isDirect, error, refetch }
}
