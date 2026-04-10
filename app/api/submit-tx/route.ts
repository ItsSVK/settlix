import { NextResponse } from 'next/server'

import { handleApi, readJsonBody } from '@/lib/api/errors'
import { processSubmitTx } from '@/lib/services/payment-submit.service'
import { submitTxBody } from '@/lib/validation'
import { VALIDATION } from '@/lib/api/constants'

export async function POST(req: Request) {
  return handleApi(async () => {
    const json = await readJsonBody(req)
    const parsed = submitTxBody.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: VALIDATION, issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const result = await processSubmitTx(parsed.data)
    if (!result.ok) {
      return NextResponse.json({ ok: false, reason: result.reason, code: result.code }, { status: result.httpStatus })
    }

    return NextResponse.json({ ok: true })
  })
}
