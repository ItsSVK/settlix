import { type NextRequest, NextResponse } from 'next/server'

import { handleApi, readJsonBody } from '@/lib/api/errors'
import { VALIDATION } from '@/lib/api/constants'
import { getSubscribersByMerchant } from '@/lib/services/subscription.service'
import { processSubscriptionCheckout } from '@/lib/services/subscription-checkout.service'
import { createSubscriptionBody } from '@/lib/validation'
import { requireAuth } from '@/lib/auth/require-auth'

/**
 * POST /api/subscriptions
 *
 * Submits the signed subscription authorization transaction, verifies the
 * first-period payment on-chain, and creates the Subscriber record.
 *
 * Body: { planId, subscriberWallet, signedTransaction, executionId }
 */
export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const json = await readJsonBody(req)
    const parsed = createSubscriptionBody.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: VALIDATION, issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const result = await processSubscriptionCheckout(parsed.data)

    if (result.failed) {
      return NextResponse.json({ status: 'Failed', signature: result.signature, error: result.error }, { status: 200 })
    }

    return NextResponse.json(
      { id: result.id, status: result.status, currentPeriodEnd: result.currentPeriodEnd, txSignature: result.txSignature },
      { status: 201 },
    )
  })
}

/**
 * GET /api/subscriptions
 *
 * Returns subscribers for the authenticated merchant's plans (dashboard view).
 */
export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const { wallet } = await requireAuth(req)
    const subscribers = await getSubscribersByMerchant(wallet)

    return NextResponse.json({
      subscriptions: subscribers.map((s) => ({
        id: s.id,
        planId: s.planId,
        subscriberName: s.subscriberName ?? null,
        subscriberEmail: s.subscriberEmail ?? null,
        subscriberWallet: s.subscriberWallet,
        status: s.status,
        currentPeriodEnd: s.currentPeriodEnd.toISOString(),
        cancelledAt: s.cancelledAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
        plan: {
          title: s.plan.title ?? null,
          amount: s.plan.amount.toString(),
          token: s.plan.token,
          interval: s.plan.interval,
        },
        lastRenewal: s.renewals[0]
          ? {
              status: s.renewals[0].status,
              txSignature: s.renewals[0].execution?.txSignature ?? null,
              executedAt: s.renewals[0].executedAt?.toISOString() ?? null,
            }
          : null,
        renewals: s.renewals.map((renewal) => ({
          id: renewal.id,
          status: renewal.status,
          dueAt: renewal.dueAt.toISOString(),
          executedAt: renewal.executedAt?.toISOString() ?? null,
          amount: renewal.amountSnapshot.toString(),
          token: renewal.tokenSnapshot,
          txSignature: renewal.execution?.txSignature ?? null,
          outputAmount: renewal.execution?.outputAmount?.toString() ?? null,
          executionStatus: renewal.execution?.status ?? null,
        })),
      })),
    })
  })
}
