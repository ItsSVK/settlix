import type { NextRequest } from 'next/server'

import { requireAuth } from '@/lib/auth/require-auth'
import { toApiResponse } from '@/lib/api/errors'
import { subscribeDashboardStream, type DashboardPaymentPaidEvent } from '@/lib/realtime/dashboard-stream'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function formatSse(event: DashboardPaymentPaidEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
}

function formatPing(): Uint8Array {
  return new TextEncoder().encode(`event: ping\ndata: {}\n\n`)
}

export async function GET(req: NextRequest) {
  try {
    const { wallet } = await requireAuth(req)

    let unsubscribe = () => {}
    let heartbeat: ReturnType<typeof setInterval> | null = null
    let streamClosed = false

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const close = () => {
          if (streamClosed) return
          streamClosed = true
          unsubscribe()
          if (heartbeat) clearInterval(heartbeat)
          try {
            controller.close()
          } catch {
            // no-op: stream is already closed
          }
        }

        unsubscribe = subscribeDashboardStream(wallet, (event) => {
          controller.enqueue(formatSse(event))
        })

        heartbeat = setInterval(() => {
          controller.enqueue(formatPing())
        }, 20_000)

        req.signal.addEventListener('abort', close)
      },
      cancel() {
        unsubscribe()
        if (heartbeat) clearInterval(heartbeat)
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    return toApiResponse(error)
  }
}
