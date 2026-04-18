import { type NextRequest, NextResponse } from 'next/server'
import { PublicKey } from '@solana/web3.js'

import { handleApi } from '@/lib/api/errors'
import { paymentLinkId } from '@/lib/validation'
import { getPaymentLinkByDetails } from '@/lib/solana/database-lookup'
import { executeJupiterOrderRequest } from '@/lib/services/jupiter-order.service'
import { processSubmitTx } from '@/lib/services/payment-submit.service'
import { createServerConnection } from '@/lib/solana/connection'
import { createPhantomSession, updatePhantomSession, type PhantomSession } from '@/lib/realtime/phantom-session-store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

type Params = { params: Promise<{ id: string; mint: string; session: string }> }

/** OPTIONS — CORS preflight required by Phantom. */
export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

/**
 * GET — Phantom fetches label + icon before showing the payment screen.
 * inputMint and sessionId come from path params so they survive Phantom's POST.
 */
export async function GET(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params
    if (!paymentLinkId.safeParse(id).success) {
      return NextResponse.json({ error: 'Not found' }, { status: 404, headers: CORS })
    }

    await getPaymentLinkByDetails(id)

    const origin = req.nextUrl.origin
    return NextResponse.json({ label: 'SettleX Payment', icon: `${origin}/icon.png` }, { headers: CORS })
  })
}

/**
 * POST — Phantom sends { account: "<buyer_wallet>" }.
 * We build the Jupiter swap tx and return it unsigned for Phantom to sign + broadcast.
 * inputMint and sessionId are in path params (Phantom strips query params on POST).
 */
export async function POST(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const { id, mint: inputMint, session: sessionId } = await params

    if (!paymentLinkId.safeParse(id).success) {
      return NextResponse.json({ error: 'Not found' }, { status: 404, headers: CORS })
    }

    const body = await req.json().catch(() => ({}))
    const buyerWallet: string | undefined = body?.account
    if (!buyerWallet) {
      return NextResponse.json({ error: 'Missing account in request body' }, { status: 400, headers: CORS })
    }

    const link = await getPaymentLinkByDetails(id)

    const order = await executeJupiterOrderRequest({
      inputMint,
      taker: buyerWallet,
      payId: id,
    })

    if (!order.transaction) {
      return NextResponse.json({ error: 'Failed to build transaction' }, { status: 500, headers: CORS })
    }

    const session: PhantomSession = {
      sessionId,
      linkId: id,
      merchantWallet: link.merchantWallet,
      buyerWallet,
      inputMint,
      outputMint: order.outputMint,
      inAmount: order.inAmount,
      outAmount: order.outAmount,
      requestId: order.requestId,
      isDirect: order.isDirect,
      createdAt: Date.now(),
      status: 'watching',
    }
    createPhantomSession(session)

    void watchAndRecord(session).catch(() => {
      updatePhantomSession(sessionId, { status: 'timeout' })
    })

    return NextResponse.json({ transaction: order.transaction }, { headers: CORS })
  })
}

// ---------------------------------------------------------------------------
// Background watcher
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

async function watchAndRecord(session: PhantomSession) {
  const connection = createServerConnection()
  const merchantPk = new PublicKey(session.merchantWallet)

  await sleep(4_000)

  const deadline = session.createdAt + 3 * 60 * 1000

  while (Date.now() < deadline) {
    try {
      const sigs = await connection.getSignaturesForAddress(merchantPk, { limit: 15 })

      for (const sigInfo of sigs) {
        if (sigInfo.err) continue
        if ((sigInfo.blockTime ?? 0) * 1_000 < session.createdAt) continue

        const tx = await connection.getTransaction(sigInfo.signature, {
          maxSupportedTransactionVersion: 0,
        })
        if (!tx) continue

        const accountKeys = tx.transaction.message.staticAccountKeys ?? []
        const involvesBuyer = accountKeys.some((k) => k.toBase58() === session.buyerWallet)
        if (!involvesBuyer) continue

        const result = await processSubmitTx({
          executionId: crypto.randomUUID(),
          txSignature: sigInfo.signature,
          linkId: session.linkId,
          userWallet: session.buyerWallet,
          inputToken: session.inputMint,
          inputAmount: session.inAmount,
          outputAmount: session.outAmount,
        })

        if (result.ok) {
          updatePhantomSession(session.sessionId, {
            status: 'confirmed',
            txSignature: sigInfo.signature,
          })
          return
        }
        // Verification failed — unrelated tx, keep watching.
      }
    } catch {
      // Transient RPC error — keep trying.
    }

    await sleep(3_000)
  }

  updatePhantomSession(session.sessionId, { status: 'timeout' })
}
