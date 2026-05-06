import { type NextRequest, NextResponse } from 'next/server'
import { handleApi } from '@/lib/api/errors'
import { getSessionFromRequest } from '@/lib/auth/session'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const session = await getSessionFromRequest(req)
    if (!session?.wallet) return NextResponse.json({ wallet: null, merchantId: null })
    const merchant = await prisma.merchant.findUnique({
      where: { wallet: session.wallet },
      select: { id: true },
    })
    return NextResponse.json({ wallet: session.wallet, merchantId: merchant?.id ?? null })
  })
}
