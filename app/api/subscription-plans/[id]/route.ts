import { type NextRequest, NextResponse } from 'next/server'

import { handleApi, readJsonBody } from '@/lib/api/errors'
import { NOT_FOUND, VALIDATION } from '@/lib/api/constants'
import { updatePlanActiveBody } from '@/lib/validation'
import { requireAuth } from '@/lib/auth/require-auth'
import { archiveSubscriptionPlan, updateSubscriptionPlanActive } from '@/lib/services/subscription.service'

type Params = { params: Promise<{ id: string }> }

/** PATCH /api/subscription-plans/[id] — toggle active */
export async function PATCH(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const { wallet } = await requireAuth(req)
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Not found', code: NOT_FOUND }, { status: 404 })
    }

    const json = await readJsonBody(req)
    const parsed = updatePlanActiveBody.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: VALIDATION, issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const updated = await updateSubscriptionPlanActive(id, wallet, parsed.data.active)
    return NextResponse.json({ id: updated.id, active: updated.active })
  })
}

/** DELETE /api/subscription-plans/[id] — archive */
export async function DELETE(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const { wallet } = await requireAuth(req)
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Not found', code: NOT_FOUND }, { status: 404 })
    }

    await archiveSubscriptionPlan(id, wallet)
    return new NextResponse(null, { status: 204 })
  })
}
