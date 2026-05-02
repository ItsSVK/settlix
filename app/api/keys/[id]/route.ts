import { type NextRequest, NextResponse } from 'next/server'

import { ApiError, handleApi } from '@/lib/api/errors'
import { requireAuth } from '@/lib/auth/require-auth'
import { prisma } from '@/lib/db'
import { NOT_FOUND } from '@/lib/api/constants'

type Params = { params: Promise<{ id: string }> }

/** DELETE /api/keys/[id] — revoke an API key */
export async function DELETE(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const { wallet } = await requireAuth(req)
    const { id } = await params

    const apiKey = await prisma.apiKey.findUnique({ where: { id }, select: { merchantWallet: true } })

    if (!apiKey) throw new ApiError(404, 'API key not found', NOT_FOUND)
    if (apiKey.merchantWallet !== wallet) throw new ApiError(404, 'API key not found', NOT_FOUND)

    await prisma.apiKey.delete({ where: { id } })

    return new NextResponse(null, { status: 204 })
  })
}
