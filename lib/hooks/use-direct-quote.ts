'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useQuotePoller } from './use-quote-poller'

interface DirectQuoteResult {
  inAmount: string
  outAmount: string
  inputMint: string
  outputMint: string
  isDirect: boolean
}

/**
 * Like useQuote but for the pay-any-address flow — no linkId, uses
 * /api/checkout/transfer/quote with a provided receiverWallet and USDC amount.
 */
export function useDirectQuote(
  inputMint: string | null,
  receiverWallet: string,
  amount: string,
  options: { disabled?: boolean } = {},
) {
  const queryClient = useQueryClient()

  const payload =
    inputMint && receiverWallet && amount ? { inputMint, receiverWallet, amount } : null

  // Read isDirect from TQ cache instead of tracking it with useState/useEffect.
  // First render: cache is empty → isDirect=false → poller fetches and starts the refresh interval.
  // After first response: TQ re-renders → cache has isDirect=true → poller drops the interval.
  const cached = queryClient.getQueryData<DirectQuoteResult>(['quote', '/api/checkout/transfer/quote', payload])
  const isDirect = cached?.isDirect ?? false

  const { quote, isLoading, isRefreshing, error } = useQuotePoller<DirectQuoteResult>(
    '/api/checkout/transfer/quote',
    payload,
    isDirect,
    options,
  )

  return { quote, isLoading, isRefreshing, isDirect: quote?.isDirect ?? false, error }
}
