import { getJupiterApiKey } from '@/lib/env/server'
import * as fs from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

const JUPITER_SWAP_V2 = 'https://api.jup.ag/swap/v2'
const JUPITER_DEBUG_LOG = process.env.JUPITER_DEBUG_LOG === '1'
const JUPITER_LOG_PATH = join(tmpdir(), 'settlex-jupiter.log')

function preview(value: string, max = 500) {
  return value.length > max ? `${value.slice(0, max)}...` : value
}

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

  const logEntry = JUPITER_DEBUG_LOG
    ? {
        timestamp: new Date().toISOString(),
        url,
        method: init?.method ?? 'GET',
        requestBody: init?.body ? preview(String(init.body)) : undefined,
        status: 0,
        responsePreview: undefined as string | undefined,
        responseKeys: undefined as string[] | undefined,
        error: undefined as string | undefined,
      }
    : null

  try {
    const res = await fetch(url, {
      ...init,
      headers: { 'x-api-key': apiKey, ...init?.headers },
    })

    if (logEntry) {
      logEntry.status = res.status
    }

    if (res.status === 429) {
      const error = 'Jupiter rate limited. Try again shortly.'
      if (logEntry) {
        logEntry.error = error
      }
      throw new Error(error)
    }
    if (!res.ok) {
      const text = await res.text()

      let errorMsg = text.slice(0, 500)
      try {
        const parsed = JSON.parse(text)
        errorMsg = parsed.error || parsed.errorMessage || errorMsg
      } catch {}

      if (logEntry) {
        logEntry.responsePreview = preview(text)
        logEntry.error = errorMsg
      }
      throw new Error(errorMsg)
    }

    const data = await res.json()
    if (logEntry) {
      if (Array.isArray(data)) {
        logEntry.responsePreview = `array(${data.length})`
      } else if (data && typeof data === 'object') {
        logEntry.responseKeys = Object.keys(data as Record<string, unknown>).slice(0, 20)
      }
    }

    return data as T
  } catch (e: unknown) {
    if (logEntry && !logEntry.error) {
      logEntry.error = e instanceof Error ? e.message : 'Unknown Jupiter fetch error'
    }
    throw e
  } finally {
    if (logEntry) {
      fs.appendFile(JUPITER_LOG_PATH, JSON.stringify(logEntry) + '\n', 'utf-8').catch(() => {})
    }
  }
}

/**
 * GET /order with swapMode=ExactOut — `amount` is the exact output you want.
 * Omit `taker` for a quote-only call; include `taker` to receive an assembled transaction.
 */
function buildOrderUrl(
  inputMint: string,
  outputMint: string,
  exactOutRaw: string,
  taker?: string,
  receiver?: string,
): string {
  const p = new URLSearchParams({
    inputMint,
    outputMint,
    amount: exactOutRaw,
    swapMode: 'ExactOut',
  })
  if (taker) p.set('taker', taker)
  if (receiver) p.set('receiver', receiver)
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
  receiver?: string,
): Promise<JupiterOrderResponse> {
  const url = buildOrderUrl(inputMint, outputMint, exactOutRaw.toString(), taker, receiver)
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
