import { NextResponse } from 'next/server'
import { handleApi } from '@/lib/api/errors'
import { prisma } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const { id } = await params
    const merchant = await prisma.merchant.findUnique({
      where: { id },
      select: { id: true, wallet: true },
    })
    if (!merchant) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(merchant)
  })
}
