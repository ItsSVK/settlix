export interface DashboardPaymentPaidEvent {
  type: 'payment_paid'
  merchantWallet: string
  // Exactly one of linkId / invoiceId will be present depending on payment source.
  linkId?: string
  invoiceId?: string
  executionId: string
  txSignature: string
  outputAmount: string
  settlementToken: string
  createdAt: string
}

type DashboardStreamEvent = DashboardPaymentPaidEvent
type Listener = (event: DashboardStreamEvent) => void

type StreamRegistry = Map<string, Set<Listener>>

declare global {
  // Persist subscribers across module reloads during local development.
  var __settlixDashboardStreamRegistry: StreamRegistry | undefined
}

function getRegistry(): StreamRegistry {
  if (!globalThis.__settlixDashboardStreamRegistry) {
    globalThis.__settlixDashboardStreamRegistry = new Map<string, Set<Listener>>()
  }
  return globalThis.__settlixDashboardStreamRegistry
}

export function subscribeDashboardStream(merchantWallet: string, listener: Listener): () => void {
  const registry = getRegistry()
  const listeners = registry.get(merchantWallet) ?? new Set<Listener>()
  listeners.add(listener)
  registry.set(merchantWallet, listeners)

  return () => {
    const current = registry.get(merchantWallet)
    if (!current) return
    current.delete(listener)
    if (current.size === 0) {
      registry.delete(merchantWallet)
    }
  }
}

export function publishDashboardPaymentPaid(event: DashboardPaymentPaidEvent) {
  const registry = getRegistry()
  const listeners = registry.get(event.merchantWallet)
  if (!listeners || listeners.size === 0) return

  for (const listener of [...listeners]) {
    try {
      listener(event)
    } catch {
      // Listener threw (closed controller) — evict it so stale entries don't accumulate.
      listeners.delete(listener)
    }
  }

  if (listeners.size === 0) registry.delete(event.merchantWallet)
}
