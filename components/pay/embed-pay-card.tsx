'use client'

import { useCallback } from 'react'
import { PayCardBase } from './pay-card-base'

function postToParent(msg: Record<string, unknown>) {
  try {
    window.parent.postMessage(msg, '*')
  } catch {
    // no-op when parent is unavailable
  }
}

interface EmbedPayCardProps {
  linkId: string
  metadata?: Record<string, unknown> | null
}

export function EmbedPayCard({ linkId, metadata }: EmbedPayCardProps) {
  const handlePaid = useCallback(
    (txSignature: string) => {
      postToParent({ type: 'settlix:paid', txSignature, metadata: metadata ?? null })
    },
    [metadata],
  )

  return <PayCardBase linkId={linkId} onPaid={handlePaid} />
}
