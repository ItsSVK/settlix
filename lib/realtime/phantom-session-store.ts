export type PhantomSessionStatus = 'watching' | 'confirmed' | 'timeout'

export interface PhantomSession {
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
  status: PhantomSessionStatus
  txSignature?: string
}

type SessionRegistry = Map<string, PhantomSession>

declare global {
  // Persist across hot-reloads in development.
  var __settlexPhantomSessionRegistry: SessionRegistry | undefined
}

function getRegistry(): SessionRegistry {
  if (!globalThis.__settlexPhantomSessionRegistry) {
    globalThis.__settlexPhantomSessionRegistry = new Map()
  }
  return globalThis.__settlexPhantomSessionRegistry
}

export function createPhantomSession(session: PhantomSession): void {
  getRegistry().set(session.sessionId, session)
}

export function getPhantomSession(sessionId: string): PhantomSession | undefined {
  return getRegistry().get(sessionId)
}

export function updatePhantomSession(sessionId: string, update: Partial<PhantomSession>): void {
  const session = getRegistry().get(sessionId)
  if (!session) return
  Object.assign(session, update)
}
