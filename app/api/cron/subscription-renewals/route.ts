import { type NextRequest, NextResponse } from 'next/server'
import { getCronSecret } from '@/lib/env/server'
import { processDueRenewals } from '@/lib/services/subscription-renewal.service'
import { apiLogger } from '@/lib/api/logger'

/**
 * GET /api/cron/subscription-renewals
 *
 * Called by Vercel Cron every hour. Runs the renewal window for the current
 * UTC hour — only hours 22, 23, and 0 do actual work.
 *
 * Protected by Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: NextRequest) {
  try {
    const secret = getCronSecret()
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } catch {
    return NextResponse.json({ error: 'Cron secret not configured' }, { status: 503 })
  }

  const now = new Date()
  apiLogger.info('Subscription renewal cron triggered', { utcHour: now.getUTCHours() })

  try {
    const summary = await processDueRenewals(now)
    apiLogger.info('Subscription renewal cron complete', summary)
    return NextResponse.json({ ok: true, ...summary })
  } catch (e) {
    apiLogger.error('Subscription renewal cron failed', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
