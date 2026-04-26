'use client'

import { BackgroundBeams } from '@/components/ui/background-beams'
import { JupiterCallout } from './jupiter-callout'
import { PayCardBase } from './pay-card-base'

export function PayCard({ linkId, onPaid }: { linkId: string; onPaid?: (txSignature: string) => void }) {
  return (
    <div className='relative flex flex-1 w-full items-center justify-center bg-background px-4 py-20'>
      <BackgroundBeams className='opacity-40' />

      <div className='relative z-10 flex w-full max-w-sm flex-col items-center gap-4'>
        {/* Jupiter moat callout — always visible above the card */}
        <JupiterCallout />

        <PayCardBase linkId={linkId} onPaid={onPaid} />
      </div>
    </div>
  )
}
