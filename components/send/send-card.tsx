'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { AddressAmountForm } from './address-amount-form'
import { DirectPayCard } from './direct-pay-card'

type Step = 'form' | 'pay'

interface PayTarget {
  receiverWallet: string
  amount: string
}

export function SendCard() {
  const [step, setStep] = useState<Step>('form')
  const [target, setTarget] = useState<PayTarget | null>(null)

  const handleContinue = (receiverWallet: string, amount: string) => {
    setTarget({ receiverWallet, amount })
    setStep('pay')
  }

  return (
    <div className='relative flex flex-1 w-full items-center justify-center bg-background px-4 py-20'>
      <BackgroundBeams className='opacity-40' />

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
                  <h1 className='text-xl font-bold text-foreground'>Send to anyone</h1>
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
