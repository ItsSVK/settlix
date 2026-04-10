import type { NextRequest } from 'next/server'

import { ApiError } from '@/lib/api/errors'
import { UNAUTHORIZED } from '@/lib/api/constants'
import { getSessionFromRequest } from '@/lib/auth/session'

/**
 * Guard for protected route handlers.
 *
 * Reads the `settlex_session` JWT cookie from the request, verifies it,
 * and returns the authenticated wallet address.
 *
 * Throws `ApiError(401)` if the cookie is absent or the JWT is invalid/expired.
 *
 * Usage:
 * ```ts
 * const { wallet } = await requireAuth(req)
 * ```
 */
export async function requireAuth(req: NextRequest): Promise<{ wallet: string }> {
  const session = await getSessionFromRequest(req)
  if (!session) {
    throw new ApiError(401, 'Unauthorized', UNAUTHORIZED)
  }
  return session
}
