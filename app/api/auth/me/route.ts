import { type NextRequest, NextResponse } from 'next/server'
import { handleApi } from '@/lib/api/errors'
import { getSessionFromRequest } from '@/lib/auth/session'

/**
 * GET /api/auth/me
 *
 * Returns the wallet of the currently authenticated merchant.
 * Returns { wallet: null } (not 401) when not logged in — lets the client
 * decide what to do without the browser throwing a console error.
 */
export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const session = await getSessionFromRequest(req)
    return NextResponse.json({ wallet: session?.wallet ?? null })
  })
}
