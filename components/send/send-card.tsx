'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { AddressAmountForm } from './address-amount-form'
import { DirectPayCard } from './direct-pay-card'
import { cn } from '@/lib/utils'

type Step = 'form' | 'pay'

interface PayTarget {
  receiverWallet: string
  amount: string
}

interface SendCardProps {
  variant?: 'page' | 'embedded'
  className?: string
}

export function SendCard({ variant = 'page', className }: SendCardProps) {
  const [step, setStep] = useState<Step>('form')
  const [target, setTarget] = useState<PayTarget | null>(null)
  const isEmbedded = variant === 'embedded'
  const Title = isEmbedded ? 'h3' : 'h1'

  const handleContinue = (receiverWallet: string, amount: string) => {
    setTarget({ receiverWallet, amount })
    setStep('pay')
  }

  return (
    <div
      className={cn(
        'relative flex w-full items-center justify-center px-4',
        isEmbedded ? 'py-0' : 'flex-1 py-20',
        className,
      )}
    >
      {!isEmbedded && <BackgroundBeams className='opacity-40' />}

      <div className='relative z-10 flex w-full max-w-sm flex-col items-center'>
        <AnimatePresence mode='wait'>
          {step === 'form' ? (
            <motion.div
              key='form'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className='w-full'
            >
              <div className='rounded-2xl border border-border/50 bg-card/80 p-6 shadow-2xl backdrop-blur-sm'>
                <div className='mb-6 text-center'>
                  <Title className='text-xl font-bold text-foreground'>Send to anyone</Title>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    Pay any Solana wallet with any token. They receive USDC.
                  </p>
                </div>
                <AddressAmountForm onContinue={handleContinue} />
              </div>
            </motion.div>
          ) : target ? (
            <motion.div
              key='pay'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className='w-full flex flex-col items-center'
            >
              <DirectPayCard
                receiverWallet={target.receiverWallet}
                amount={target.amount}
                onBack={() => setStep('form')}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}
