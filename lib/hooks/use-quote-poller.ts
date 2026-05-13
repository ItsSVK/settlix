'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'

export const REFRESH_INTERVAL_MS = process.env.NODE_ENV === 'development' ? 30_000 : 10_000

export interface QuoteBase {
  inAmount: string
  outAmount: string
  inputMint: string
  outputMint: string
}

/**
 * Core polling engine shared by useQuote and useDirectQuote.
 * Uses TanStack Query for caching, background refresh, page-visibility pause,
 * request deduplication, and error handling.
 *
 * @param isDirect When true, auto-refresh is skipped (rate is always 1:1).
 */
export function useQuotePoller<T extends QuoteBase>(
  endpoint: string,
  payload: Record<string, string | undefined | null> | null,
  isDirect: boolean,
  options: { disabled?: boolean } = {},
) {
  const { data: quote, isPending, isFetching, error, refetch } = useQuery<T, Error>({
    queryKey: ['quote', endpoint, payload],
    queryFn: () => apiClient.post<T>(endpoint, payload),
    enabled: !!payload && !options.disabled,
    refetchInterval: isDirect ? false : REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    staleTime: 0,
    retry: false,
  })

  return {
    quote: quote ?? null,
    // isPending = no cached data + fetching in flight → initial skeleton state
    isLoading: isPending && isFetching,
    // isFetching without isPending = background refresh, cached data still shown
    isRefreshing: isFetching && !isPending,
    error: error?.message ?? null,
    refetch,
  }
}
