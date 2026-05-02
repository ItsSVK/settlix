import { PublicKey } from '@solana/web3.js'
import { type NextRequest, NextResponse } from 'next/server'

import { ApiError, handleApi, readJsonBody } from '@/lib/api/errors'
import { getSolanaCluster } from '@/lib/env/server'
import { decimalFromCreateLinkAmount } from '@/lib/money'
import { isAllowedSettlementMint } from '@/lib/solana/constants'
import { createPaymentLink } from '@/lib/services/payment-link.service'
import { createLinkBody } from '@/lib/validation'
import { INVALID_AMOUNT, UNSUPPORTED_SETTLEMENT_TOKEN, VALIDATION } from '@/lib/api/constants'
import { requireAuth } from '@/lib/auth/require-auth'
import { PaymentExecution, SplitRecipient } from '@/lib/generated/prisma/client'
import { getPaymentLinksByWallet } from '@/lib/services/payment-link.service'

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    // Wallet comes from the authenticated session — not from a query param
    const { wallet } = await requireAuth(req)

    const links = await getPaymentLinksByWallet(wallet)

    const result = links.map((link) => {
      const executions = link.executions ?? []
      const paidCount = executions.filter((e: PaymentExecution) => e.status === 'paid').length
      const totalVolume = executions
        .filter((e: PaymentExecution) => e.status === 'paid')
        .reduce((sum: number, e: PaymentExecution) => sum + Number(e.outputAmount), 0)

      return {
        id: link.id,
        merchantWallet: link.merchantWallet,
        token: link.token,
        amount: link.amount.toString(),
        title: link.title ?? undefined,
        description: link.description ?? undefined,
        type: link.type,
        active: link.active,
        expiresAt: link.expiresAt?.toISOString() ?? null,
        maxUses: link.maxUses ?? null,
        createdAt: link.createdAt.toISOString(),
        recipients: (link.recipients ?? []).map((r: SplitRecipient) => ({
          wallet: r.wallet,
          basisPoints: r.basisPoints,
        })),
        stats: {
          totalExecutions: executions.length,
          paidCount,
          failedCount: executions.filter((e: PaymentExecution) => e.status === 'failed').length,
          pendingCount: executions.filter((e: PaymentExecution) => e.status === 'pending').length,
          totalVolume: totalVolume,
          successRate: executions.length > 0 ? Math.round((paidCount / executions.length) * 100) : null,
        },
        recentExecutions: executions.slice(0, 5).map((e: PaymentExecution) => ({
          id: e.id,
          userWallet: e.userWallet,
          inputToken: e.inputToken,
          inputAmount: e.inputAmount.toString(),
          outputAmount: e.outputAmount.toString(),
          txSignature: e.txSignature,
          status: e.status,
          createdAt: e.createdAt.toISOString(),
        })),
      }
    })

    return NextResponse.json({ links: result })
  })
}

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    // Merchant must be authenticated — wallet comes from the JWT session
    const { wallet: merchantWallet } = await requireAuth(req)

    const json = await readJsonBody(req)
    const parsed = createLinkBody.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: VALIDATION, issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const cluster = getSolanaCluster()

    // Validate that the session wallet is a valid public key (belt-and-suspenders)
    try {
      new PublicKey(merchantWallet)
    } catch {
      throw new ApiError(400, 'Session wallet is not a valid public key', 'INVALID_WALLET')
    }

    if (!isAllowedSettlementMint(parsed.data.token, cluster)) {
      throw new ApiError(400, 'Unsupported settlement token for this network', UNSUPPORTED_SETTLEMENT_TOKEN)
    }

    const amount = decimalFromCreateLinkAmount(parsed.data.amount)
    if (!amount.gt(0)) {
      throw new ApiError(400, 'Amount must be positive', INVALID_AMOUNT)
    }

    // Validate split recipients when provided
    const recipients = parsed.data.recipients
    if (recipients && recipients.length > 0) {
      // All wallets must be valid public keys
      for (const r of recipients) {
        try {
          new PublicKey(r.wallet)
        } catch {
          throw new ApiError(400, `Invalid recipient wallet: ${r.wallet}`, 'INVALID_RECIPIENT_WALLET')
        }
      }

      // Basis points must sum to exactly 10000
      const totalBps = recipients.reduce((sum, r) => sum + r.basisPoints, 0)
      if (totalBps !== 10000) {
        throw new ApiError(400, `Recipient basis points must sum to 10000 (got ${totalBps})`, 'INVALID_SPLIT_BPS')
      }
    }

    const link = await createPaymentLink({
      merchantWallet,
      token: parsed.data.token,
      amount,
      title: parsed.data.title,
      description: parsed.data.description,
      recipients,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
      maxUses: parsed.data.maxUses,
    })

    return NextResponse.json({
      id: link.id,
      payPath: `/pay/${link.id}`,
    }, { status: 201 })
  })
}
