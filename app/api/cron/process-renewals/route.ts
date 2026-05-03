import { type NextRequest, NextResponse } from 'next/server'

import { handleApi } from '@/lib/api/errors'
import { apiLogger } from '@/lib/api/logger'
import { getCronSecret } from '@/lib/env/server'
import { processDueRenewals } from '@/lib/services/subscription-renewal.service'

/**
 * POST /api/cron/process-renewals
 *
 * Protected cron endpoint that processes all due subscription renewals.
 * Requires the X-Cron-Secret header to match CRON_SECRET env var.
 * Invoke via Vercel Cron, an external scheduler, or the CLI script.
 */
export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const provided = req.headers.get('x-cron-secret')
    let expected: string
    try {
      expected = getCronSecret()
    } catch {
      return NextResponse.json({ error: 'Cron not configured' }, { status: 503 })
    }

    if (!provided || provided !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    apiLogger.info('Processing subscription renewals')
    const summary = await processDueRenewals()
    apiLogger.info('Renewal run complete', summary)

    return NextResponse.json(summary)
  })
}
