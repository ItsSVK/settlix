import type { NextRequest } from 'next/server'

import { requireSession } from '@/lib/auth/require-auth'
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

// Max lifetime per connection. EventSource reconnects automatically after the
// server closes. Without this, zombie connections (e.g. from dev hot-reloads
// where req.signal abort doesn't fire) accumulate and leak memory.
const MAX_STREAM_MS = 5 * 60_000

export async function GET(req: NextRequest) {
  try {
    const { wallet } = await requireSession(req)

    let unsubscribe = () => {}
    let heartbeat: ReturnType<typeof setInterval> | null = null
    let maxAge: ReturnType<typeof setTimeout> | null = null
    let streamClosed = false

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const close = () => {
          if (streamClosed) return
          streamClosed = true
          unsubscribe()
          if (heartbeat) clearInterval(heartbeat)
          if (maxAge) clearTimeout(maxAge)
          try {
            controller.close()
          } catch {
            // no-op: stream is already closed
          }
        }

        unsubscribe = subscribeDashboardStream(wallet, (event) => {
          if (streamClosed) return
          try {
            controller.enqueue(formatSse(event))
          } catch {
            close()
          }
        })

        heartbeat = setInterval(() => {
          if (streamClosed) return
          try {
            controller.enqueue(formatPing())
          } catch {
            close()
          }
        }, 20_000)

        maxAge = setTimeout(close, MAX_STREAM_MS)

        req.signal.addEventListener('abort', close)
      },
      cancel() {
        unsubscribe()
        if (heartbeat) clearInterval(heartbeat)
        if (maxAge) clearTimeout(maxAge)
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
