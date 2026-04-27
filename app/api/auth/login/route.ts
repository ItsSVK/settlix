import { NextResponse } from 'next/server'

import { ApiError, handleApi, readJsonBody } from '@/lib/api/errors'
import { UNAUTHORIZED, VALIDATION } from '@/lib/api/constants'
import { walletLoginBody } from '@/lib/validation'
import { consumeNonce } from '@/lib/auth/nonce-store'
import { verifyWalletSignature } from '@/lib/auth/verify-signature'
import { signSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session'
import { prisma } from '@/lib/db'

/** The exact message prefix that clients must sign. */
export const SIGN_MESSAGE_PREFIX = 'Sign in to Settlix:\n'

/**
 * POST /api/auth/login
 *
 * Body: { wallet, signature, nonce }
 *   - wallet:    Base58 Solana public key
 *   - signature: Base64-encoded Ed25519 signature
 *   - nonce:     UUID previously obtained from GET /api/auth/nonce
 *
 * The expected signed message is:
 *   "Sign in to Settlix:\n<nonce>"
 *
 * On success, sets an HttpOnly JWT cookie and returns { wallet }.
 */
export async function POST(req: Request) {
  return handleApi(async () => {
    const json = await readJsonBody(req)
    const parsed = walletLoginBody.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: VALIDATION, issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const { wallet, signature, nonce } = parsed.data

    // 1. Consume the nonce — rejects expired or already-used nonces
    const nonceValid = consumeNonce(nonce)
    if (!nonceValid) {
      throw new ApiError(401, 'Nonce is invalid or expired', UNAUTHORIZED)
    }

    // 2. Reconstruct the signed message and verify the Ed25519 signature
    const message = `${SIGN_MESSAGE_PREFIX}${nonce}`
    const sigValid = verifyWalletSignature(wallet, message, signature)
    if (!sigValid) {
      throw new ApiError(401, 'Signature verification failed', UNAUTHORIZED)
    }

    // 3. Upsert merchant record — creates on first login, updates lastSeenAt on subsequent logins
    await prisma.merchant.upsert({
      where: { wallet },
      create: { wallet },
      update: { lastSeenAt: new Date() },
    })

    // 4. Issue JWT and set HttpOnly cookie
    const token = await signSession(wallet)
    const res = NextResponse.json({ wallet }, { status: 200 })
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
    return res
  })
}
