import { createHash } from 'node:crypto'

import type { NextRequest } from 'next/server'

import { ApiError } from '@/lib/api/errors'
import { UNAUTHORIZED } from '@/lib/api/constants'
import { getSessionFromRequest } from '@/lib/auth/session'
import { prisma } from '@/lib/db'

// Bearer token takes priority; falls back to session cookie.
// All existing routes get API key support for free — no changes needed per-route.
export async function requireAuth(req: NextRequest): Promise<{ wallet: string }> {
  const authHeader = req.headers.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const rawKey = authHeader.slice(7).trim()
    if (!rawKey) throw new ApiError(401, 'Unauthorized', UNAUTHORIZED)

    const keyHash = createHash('sha256').update(rawKey).digest('hex')
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { merchant: { select: { wallet: true } } },
    })

    if (!apiKey) throw new ApiError(401, 'Invalid API key', UNAUTHORIZED)

    // Fire-and-forget — don't block the request on a timestamp update
    void prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })

    return { wallet: apiKey.merchant.wallet }
  }

  const session = await getSessionFromRequest(req)
  if (!session) throw new ApiError(401, 'Unauthorized', UNAUTHORIZED)
  return session
}

// Session-cookie-only auth — rejects API key Bearer tokens.
// Use this on routes that must run in the dashboard context (SSE streams,
// wallet-signing flows, internal operations that have no headless use case).
export async function requireSession(req: NextRequest): Promise<{ wallet: string }> {
  const session = await getSessionFromRequest(req)
  if (!session) throw new ApiError(401, 'Unauthorized', UNAUTHORIZED)
  return session
}
