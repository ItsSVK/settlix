import { type NextRequest, NextResponse } from 'next/server'
import { getSolanaPaySession } from '@/lib/realtime/solana-pay-session-store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/links/[id]/payment-status?session=<sessionId>
 *
 * Polled by the SolanaQRModal every 2 seconds.
 * Returns the current status of the background watcher for this session.
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session')

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session param' }, { status: 400 })
  }

  const session = getSolanaPaySession(sessionId)

  if (!session) {
    return NextResponse.json({ status: 'not_found' })
  }

  return NextResponse.json({
    status: session.status,
    txSignature: session.txSignature ?? null,
  })
}
