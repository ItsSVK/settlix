import { NextResponse } from 'next/server'
import { handleApi } from '@/lib/api/errors'
import { SESSION_COOKIE } from '@/lib/auth/session'

/**
 * POST /api/auth/logout
 *
 * Clears the session cookie. Always succeeds regardless of whether a session exists.
 */
export async function POST() {
  return handleApi(async () => {
    const res = NextResponse.json({ ok: true })
    res.cookies.set(SESSION_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0, // Immediately expire
    })
    return res
  })
}
