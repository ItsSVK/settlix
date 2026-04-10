import { getJupiterApiKey } from '@/lib/env/server'

const JUPITER_SWAP_V2 = 'https://api.jup.ag/swap/v2'

export type JupiterOrderResponse = {
  requestId: string
  inputMint: string
  outputMint: string
  inAmount: string
  outAmount: string
  transaction: string | null
  router?: string
  mode?: string
  feeBps?: number
  feeMint?: string
  error?: string
  errorMessage?: string
}

export type JupiterExecuteResponse = {
  status: 'Success' | 'Failed'
  signature: string
  code: number
  inputAmountResult: string
  outputAmountResult: string
  error?: string
}

export async function jupiterFetch<T>(pathWithQuery: string, init?: RequestInit): Promise<T> {
  const apiKey = getJupiterApiKey()
  const url = `${JUPITER_SWAP_V2}${pathWithQuery}`
  const res = await fetch(url, {
    ...init,
    headers: { 'x-api-key': apiKey, ...init?.headers },
  })
  if (res.status === 429) {
    throw new Error('Jupiter rate limited. Try again shortly.')
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Jupiter ${res.status}: ${text.slice(0, 500)}`)
  }
  return res.json() as Promise<T>
}

/**
 * GET /order with swapMode=ExactOut — `amount` is the exact output you want.
 * Omit `taker` for a quote-only call; include `taker` to receive an assembled transaction.
 */
function buildOrderUrl(inputMint: string, outputMint: string, exactOutRaw: string, taker?: string): string {
  const p = new URLSearchParams({
    inputMint,
    outputMint,
    amount: exactOutRaw,
    swapMode: 'ExactOut',
  })
  if (taker) p.set('taker', taker)
  return `/order?${p.toString()}`
}

/**
 * Quote-only (no taker). Returns estimated `inAmount` for an exact output.
 * Single HTTP call — no iteration required.
 */
export async function getExactOutQuote(
  inputMint: string,
  outputMint: string,
  exactOutRaw: bigint,
): Promise<JupiterOrderResponse> {
  const url = buildOrderUrl(inputMint, outputMint, exactOutRaw.toString())
  const response = await jupiterFetch<JupiterOrderResponse>(url)
  if (response.error || response.errorMessage) {
    throw new Error(response.errorMessage ?? response.error ?? 'Jupiter quote failed')
  }
  return response
}

/**
 * Full order with assembled transaction (requires taker wallet).
 * Returns `transaction` (base64) and `requestId` for use with /execute.
 * Single HTTP call — no iteration required.
 */
export async function getExactOutOrder(
  inputMint: string,
  outputMint: string,
  exactOutRaw: bigint,
  taker: string,
): Promise<JupiterOrderResponse> {
  const url = buildOrderUrl(inputMint, outputMint, exactOutRaw.toString(), taker)
  const response = await jupiterFetch<JupiterOrderResponse>(url)
  if (response.error || response.errorMessage) {
    throw new Error(response.errorMessage ?? response.error ?? 'Jupiter order failed')
  }
  if (!response.transaction) {
    throw new Error('Jupiter returned no transaction for order')
  }
  return response
}

/**
 * POST /execute — submits a signed transaction through Jupiter.
 * `signedTransaction` is the base64-encoded signed VersionedTransaction.
 */
export async function executeSwap(signedTransaction: string, requestId: string): Promise<JupiterExecuteResponse> {
  return jupiterFetch<JupiterExecuteResponse>('/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signedTransaction, requestId }),
  })
}
