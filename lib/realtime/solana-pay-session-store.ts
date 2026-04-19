export type SolanaPaySessionStatus = 'watching' | 'confirmed' | 'timeout'

export interface SolanaPaySession {
  sessionId: string
  linkId: string
  merchantWallet: string
  buyerWallet: string
  inputMint: string
  outputMint: string
  /** Raw amount string from Jupiter (e.g. "2300000000" for 2.3 SOL). */
  inAmount: string
  /** Raw amount string from Jupiter (e.g. "47820000" for 47.82 USDC). */
  outAmount: string
  requestId: string | null
  isDirect: boolean
  /** Unix ms timestamp when the session was created. */
  createdAt: number
  status: SolanaPaySessionStatus
  txSignature?: string
}

type SessionRegistry = Map<string, SolanaPaySession>

declare global {
  // Persist across hot-reloads in development.
  var __settlixSolanaPaySessionRegistry: SessionRegistry | undefined
}

function getRegistry(): SessionRegistry {
  if (!globalThis.__settlixSolanaPaySessionRegistry) {
    globalThis.__settlixSolanaPaySessionRegistry = new Map()
  }
  return globalThis.__settlixSolanaPaySessionRegistry
}

export function createSolanaPaySession(session: SolanaPaySession): void {
  getRegistry().set(session.sessionId, session)
}

export function getSolanaPaySession(sessionId: string): SolanaPaySession | undefined {
  return getRegistry().get(sessionId)
}

export function updateSolanaPaySession(sessionId: string, update: Partial<SolanaPaySession>): void {
  const session = getRegistry().get(sessionId)
  if (!session) return
  Object.assign(session, update)
}
