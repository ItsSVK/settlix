/**
 * In-memory nonce store with 5-minute TTL.
 *
 * Each nonce is issued once and consumed once — replaying a nonce is rejected.
 *
 * NOTE: This module-level Map lives in a single Node.js process. If you ever
 * run multiple server instances behind a load balancer, migrate this to a
 * shared Redis store (e.g. with `ioredis` and a short-lived key TTL).
 */

const NONCE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface NonceEntry {
  expiresAt: number
}

const store = new Map<string, NonceEntry>()

// Evict expired nonces every minute to prevent unbounded memory growth
setInterval(
  () => {
    const now = Date.now()
    for (const [nonce, entry] of store) {
      if (entry.expiresAt <= now) {
        store.delete(nonce)
      }
    }
  },
  60_000,
).unref() // Do not prevent process exit

/**
 * Issue a fresh nonce and register it in the store.
 * Returns the nonce string that must be sent to the client.
 */
export function issueNonce(): string {
  const nonce = crypto.randomUUID()
  store.set(nonce, { expiresAt: Date.now() + NONCE_TTL_MS })
  return nonce
}

/**
 * Consume a nonce.
 * Returns `true` if the nonce existed and had not expired, `false` otherwise.
 * A nonce can only be consumed once.
 */
export function consumeNonce(nonce: string): boolean {
  const entry = store.get(nonce)
  if (!entry) return false
  if (entry.expiresAt <= Date.now()) {
    store.delete(nonce)
    return false
  }
  store.delete(nonce)
  return true
}
