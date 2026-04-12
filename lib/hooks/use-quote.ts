'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const REFRESH_INTERVAL_MS = 10_000 // 10 s — fresh enough, gentle on Jupiter's rate limits

interface QuoteResult {
  inAmount: string
  outAmount: string
  inputMint: string
  outputMint: string
}

/**
 * @param payId        - payment link ID
 * @param inputMint    - mint the buyer wants to pay with (null = token not selected yet)
 * @param outputMint   - settlement mint of the payment link (used to detect same-mint case)
 *
 * When inputMint === outputMint the rate is permanently 1:1 — polling is skipped entirely.
 * One initial API call is still made to get the confirmed raw amount from the backend.
 */
export function useQuote(payId: string, inputMint: string | null, outputMint: string | null) {
  /** True when inputMint and outputMint are the same (direct transfer, no swap). */
  const isDirect = !!inputMint && !!outputMint && inputMint === outputMint

  const [quote, setQuote] = useState<QuoteResult | null>(null)
  /** True only on the very first fetch for a given token (shows skeleton). */
  const [isLoading, setIsLoading] = useState(false)
  /** True on background re-fetches — keeps existing quote visible. */
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch_ = useCallback(
    async (isBackground = false) => {
      if (!inputMint || !payId) return

      if (isBackground) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
        setQuote(null)
        setError(null)
      }

      try {
        const res = await fetch('/api/jupiter/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputMint, payId }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? 'Quote failed')
        }
        setQuote(await res.json())
        setError(null)
      } catch (e) {
        if (!isBackground) {
          setError(e instanceof Error ? e.message : 'Failed to get quote')
          setQuote(null)
        }
        // Background refresh errors are silent — keep the last good quote visible
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [payId, inputMint, isDirect],
  )

  // Initial fetch (debounced 400ms) whenever the selected token changes.
  // Runs for both same-mint and swap cases — we still need the confirmed raw amount.
  useEffect(() => {
    setQuote(null)
    setError(null)
    if (!inputMint) return
    const t = setTimeout(() => fetch_(false), 400)
    return () => clearTimeout(t)
  }, [inputMint]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh every REFRESH_INTERVAL_MS — SKIPPED entirely for same-mint payments.
  // The rate is always 1:1, so there is nothing to refresh.
  useEffect(() => {
    if (!inputMint || isDirect) return
    const interval = setInterval(() => fetch_(true), REFRESH_INTERVAL_MS)
    return () => {
      clearInterval(interval)
    }
  }, [inputMint, isDirect, fetch_])

  return { quote, isLoading, isRefreshing, isDirect, error, refetch: () => fetch_(true) }
}
