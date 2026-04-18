import { type NextRequest, NextResponse } from 'next/server'
import { getPhantomSession } from '@/lib/realtime/phantom-session-store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/pay/[id]/status?session=<sessionId>
 *
 * Polled by the PhantomQrModal every 2 seconds.
 * Returns the current status of the background watcher for this session.
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session')

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session param' }, { status: 400 })
  }

  const session = getPhantomSession(sessionId)

  if (!session) {
    return NextResponse.json({ status: 'not_found' })
  }

  return NextResponse.json({
    status: session.status,
    txSignature: session.txSignature ?? null,
  })
}
