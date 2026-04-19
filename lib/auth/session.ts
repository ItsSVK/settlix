import 'server-only'

import { SignJWT, jwtVerify } from 'jose'
import type { NextRequest } from 'next/server'

import { getAuthSecret } from '@/lib/env/server'

export const SESSION_COOKIE = 'settlix_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 // 24 hours

interface SessionPayload {
  wallet: string
}

function getEncodedSecret(): Uint8Array {
  return new TextEncoder().encode(getAuthSecret())
}

/**
 * Sign a new JWT session token for the given wallet address.
 */
export async function signSession(wallet: string): Promise<string> {
  return new SignJWT({ wallet } satisfies SessionPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getEncodedSecret())
}

/**
 * Verify a JWT session token and return the payload, or null if invalid/expired.
 */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getEncodedSecret(), {
      algorithms: ['HS256'],
    })
    if (typeof payload.wallet !== 'string') return null
    return { wallet: payload.wallet }
  } catch {
    return null
  }
}

/**
 * Read and verify the session cookie from an incoming request.
 * Returns the session payload, or null if the cookie is absent or invalid.
 */
export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySession(token)
}

/**
 * Cookie attributes for the session cookie.
 */
export function sessionCookieOptions(): {
  httpOnly: boolean
  secure: boolean
  sameSite: 'lax'
  path: '/'
  maxAge: number
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  }
}
