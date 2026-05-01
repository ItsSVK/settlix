'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { REFRESH_INTERVAL_MS } from './use-quote'

interface DirectQuoteResult {
  inAmount: string
  outAmount: string
  inputMint: string
  outputMint: string
  isDirect: boolean
}

/**
 * Like useQuote but for the pay-any-address flow — no linkId, uses
 * /api/direct-pay/quote with a provided receiverWallet and USDC amount.
 */
export function useDirectQuote(
  inputMint: string | null,
  receiverWallet: string,
  amount: string,
  options: { disabled?: boolean } = {},
) {
  const isDirect = inputMint !== null && inputMint === receiverWallet

  const [quote, setQuote] = useState<DirectQuoteResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPageVisible, setIsPageVisible] = useState(() =>
    typeof document === 'undefined' ? true : document.visibilityState === 'visible',
  )
  const requestSeq = useRef(0)
  const activeController = useRef<AbortController | null>(null)

  useEffect(() => {
    if (typeof document === 'undefined') return
    const handler = () => setIsPageVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  const fetch_ = useCallback(
    async (isBackground = false) => {
      if (!inputMint || !receiverWallet || !amount) return
      activeController.current?.abort()

      const currentRequest = ++requestSeq.current
      const controller = new AbortController()
      activeController.current = controller

      if (isBackground) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
        setQuote(null)
        setError(null)
      }

      try {
        const res = await fetch('/api/checkout/transfer/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputMint, receiverWallet, amount }),
          signal: controller.signal,
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? 'Quote failed')
        }
        const data = await res.json()
        if (currentRequest === requestSeq.current) {
          setQuote(data)
          setError(null)
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
        if (!isBackground) {
          setError(e instanceof Error ? e.message : 'Failed to get quote')
          setQuote(null)
        }
      } finally {
        if (activeController.current === controller) activeController.current = null
        if (currentRequest === requestSeq.current) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      }
    },
    [inputMint, receiverWallet, amount],
  )

  // Initial fetch (debounced) when token changes.
  useEffect(() => {
    setQuote(null)
    setError(null)
    if (!inputMint || options.disabled) return
    const t = setTimeout(() => fetch_(false), 400)
    return () => clearTimeout(t)
  }, [inputMint, options.disabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh — skipped for same-mint (always 1:1).
  useEffect(() => {
    if (!inputMint || isDirect || !isPageVisible || options.disabled) return
    const interval = setInterval(() => fetch_(true), REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [inputMint, isDirect, isPageVisible, fetch_, options.disabled])

  useEffect(
    () => () => {
      activeController.current?.abort()
    },
    [],
  )

  return { quote, isLoading, isRefreshing, isDirect, error }
}
