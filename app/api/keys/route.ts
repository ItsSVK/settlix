import { randomBytes, createHash } from 'node:crypto'

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { handleApi, readJsonBody } from '@/lib/api/errors'
import { requireAuth } from '@/lib/auth/require-auth'
import { prisma } from '@/lib/db'
import { VALIDATION } from '@/lib/api/constants'

const MAX_KEYS_PER_WALLET = 10

const createKeyBody = z.object({
  name: z.string().trim().min(1).max(64),
})

/** GET /api/keys — list all API keys for the authenticated merchant */
export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const { wallet } = await requireAuth(req)

    const keys = await prisma.apiKey.findMany({
      where: { merchantWallet: wallet },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, lastUsedAt: true, createdAt: true },
    })

    return NextResponse.json({ keys })
  })
}

/** POST /api/keys — create a new API key, returns raw key ONCE */
export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const { wallet } = await requireAuth(req)

    const json = await readJsonBody(req)
    const parsed = createKeyBody.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: VALIDATION, issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const count = await prisma.apiKey.count({ where: { merchantWallet: wallet } })
    if (count >= MAX_KEYS_PER_WALLET) {
      return NextResponse.json(
        { error: `Maximum ${MAX_KEYS_PER_WALLET} API keys allowed`, code: 'KEY_LIMIT' },
        { status: 400 },
      )
    }

    const rawKey = 'sk_live_' + randomBytes(32).toString('hex')
    const keyHash = createHash('sha256').update(rawKey).digest('hex')

    const apiKey = await prisma.apiKey.create({
      data: { merchantWallet: wallet, keyHash, name: parsed.data.name },
      select: { id: true, name: true, createdAt: true },
    })

    // Raw key is returned ONCE and never stored — merchant must save it now
    return NextResponse.json({ ...apiKey, key: rawKey }, { status: 201 })
  })
}
