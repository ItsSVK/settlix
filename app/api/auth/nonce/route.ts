import { NextResponse } from 'next/server'
import { issueNonce } from '@/lib/auth/nonce-store'
import { handleApi } from '@/lib/api/errors'

/**
 * GET /api/auth/nonce
 *
 * Issues a one-time nonce (UUID) valid for 5 minutes.
 * The client must sign the exact string:
 *   "Sign in to Settlix:\n<nonce>"
 * using their connected Solana wallet, then POST the result to /api/auth/login.
 */
export async function GET() {
  return handleApi(async () => {
    const nonce = issueNonce()
    return NextResponse.json({ nonce })
  })
}
