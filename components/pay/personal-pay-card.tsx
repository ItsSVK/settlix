'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, Loader2, Zap } from 'lucide-react'
import { TokenSelector, type TokenInfo } from './token-selector'
import { QuoteDisplay } from './quote-display'
import { SuccessOverlay } from './success-overlay'
import { usePaymentFlow, PAY_STEP_LABELS } from '@/lib/hooks/use-payment-flow'
import { cn, shorten } from '@/lib/utils'

interface PersonalPayCardProps {
  merchantId: string
  merchantWallet: string
}

const MIN_AMOUNT = 0.01

export function PersonalPayCard({ merchantId, merchantWallet }: PersonalPayCardProps) {
  const [amount, setAmount] = useState('')
  const [debouncedAmount, setDebouncedAmount] = useState('')
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null)
  const [quote, setQuote] = useState<{ inAmount: string; outAmount: string; isDirect: boolean } | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [successResult, setSuccessResult] = useState<{
    sig: string
    swap?: { inputAmount: string; inputDecimals: number; inputSymbol: string }
  } | null>(null)
  const seqRef = useRef(0)

  // Debounce amount input 500ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedAmount(amount), 500)
    return () => clearTimeout(t)
  }, [amount])

  // Fetch quote whenever token or debounced amount changes
  useEffect(() => {
    setQuote(null)
    setQuoteError(null)
    const parsed = parseFloat(debouncedAmount)
    if (!selectedToken || !debouncedAmount || isNaN(parsed) || parsed < MIN_AMOUNT) return

    const seq = ++seqRef.current
    setQuoteLoading(true)

    fetch('/api/checkout/transfer/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputMint: selectedToken.mint, receiverWallet: merchantWallet, amount: debouncedAmount }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (seq !== seqRef.current) return
        setQuote(data)
        setQuoteLoading(false)
      })
      .catch(() => {
        if (seq !== seqRef.current) return
        setQuoteError('Failed to get quote')
        setQuoteLoading(false)
      })
  }, [selectedToken, debouncedAmount, merchantWallet])

  const parsedAmount = parseFloat(debouncedAmount)
  const amountValid = !isNaN(parsedAmount) && parsedAmount >= MIN_AMOUNT
  const quoteReady = !!quote && !quoteLoading

  const { step, setStep, errorMsg, isLoading, connected, publicKey, requestWalletConnection, signAndExecute, handleError } =
    usePaymentFlow({
      onSuccess: (txSig, swap) => setSuccessResult({ sig: txSig, swap }),
    })

  const handlePay = useCallback(async () => {
    if (!connected || !publicKey) {
      requestWalletConnection()
      return
    }
    if (!selectedToken || !quote || !amountValid) return

    setStep('building')
    try {
      const orderRes = await fetch('/api/checkout/transfer/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputMint: selectedToken.mint,
          taker: publicKey.toBase58(),
          receiverWallet: merchantWallet,
          amount: debouncedAmount,
        }),
      })
      const orderData = await orderRes.json()
      if (!orderRes.ok) throw new Error(orderData.error ?? 'Failed to build transaction')

      await signAndExecute(
        orderData.transaction,
        async (signedBase64) => {
          const res = await fetch('/api/checkout/transfer/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              signedTransaction: signedBase64,
              merchantId,
              userWallet: publicKey!.toBase58(),
              inputMint: selectedToken.mint,
              inputAmount: quote.inAmount,
              outputAmount: String(Math.round(parseFloat(debouncedAmount) * 1_000_000)),
            }),
          })
          return res.json()
        },
        { selectedToken, inAmount: quote.inAmount },
      )
    } catch (e) {
      handleError(e)
    }
  }, [
    connected, publicKey, selectedToken, quote, amountValid, debouncedAmount,
    merchantWallet, requestWalletConnection, setStep, signAndExecute, handleError,
  ])

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className='w-full'
    >
      <div className='rounded-2xl border border-border/50 bg-card/80 p-6 shadow-2xl backdrop-blur-sm'>
        {/* Header */}
        <div className='mb-6 flex flex-col items-center text-center'>
          <div className='mb-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1'>
            <p className='text-[10px] font-medium uppercase tracking-widest text-indigo-500 dark:text-indigo-400'>
              Send Payment
            </p>
          </div>
          <div className='mt-3 flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-1.5 border border-border/40'>
            <div className='h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' />
            <p className='font-mono text-xs font-medium text-muted-foreground'>{shorten(merchantWallet)}</p>
          </div>
          <div className='mx-auto mt-2 h-px w-48 bg-linear-to-r from-transparent via-border to-transparent' />
        </div>

        <AnimatePresence mode='wait'>
          {successResult ? (
            <motion.div key='success' initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <SuccessOverlay txSignature={successResult.sig} amount={debouncedAmount} swap={successResult.swap} />
            </motion.div>
          ) : (
            <motion.div key='form' className='space-y-4'>
              {/* Amount input */}
              <div>
                <p className='mb-2 text-xs font-medium text-muted-foreground'>Amount (USDC)</p>
                <div className='relative'>
                  <span className='absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground'>
                    $
                  </span>
                  <input
                    type='number'
                    min='0.01'
                    step='0.01'
                    placeholder='0.00'
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className='w-full rounded-xl border border-border/50 bg-muted/20 py-3 pl-7 pr-4 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50'
                  />
                </div>
                {amount && !amountValid && (
                  <p className='mt-1.5 text-xs text-destructive'>Minimum amount is $0.01</p>
                )}
              </div>

              {/* Token selector */}
              <div>
                <p className='mb-2 text-xs font-medium text-muted-foreground'>Pay with</p>
                <TokenSelector selected={selectedToken} onChange={setSelectedToken} />
              </div>

              {/* Quote — only shown once amount is valid */}
              {amountValid && (
                <QuoteDisplay
                  isLoading={quoteLoading}
                  isRefreshing={false}
                  isDirect={quote?.isDirect ?? false}
                  quote={quote}
                  error={quoteError}
                  selectedToken={selectedToken}
                  outputAmountUSDC={debouncedAmount}
                />
              )}

              {/* Pay */}
              {!connected ? (
                <button
                  onClick={requestWalletConnection}
                  className='flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 py-3.5 text-sm font-semibold text-primary transition-all hover:border-primary hover:bg-primary/5'
                >
                  Connect Wallet to Pay
                </button>
              ) : (
                <div className='space-y-2'>
                  <button
                    onClick={handlePay}
                    disabled={isLoading || step === 'done' || !selectedToken || !quoteReady || !amountValid}
                    className={cn(
                      'flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground',
                      'transition-all duration-200 hover:opacity-90 active:scale-[0.98]',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      step === 'error' && 'bg-destructive',
                      step === 'done' && 'bg-green-600',
                    )}
                  >
                    {isLoading && <Loader2 className='h-4 w-4 animate-spin' />}
                    {step === 'idle' && <Zap className='h-4 w-4' />}
                    {PAY_STEP_LABELS[step]}
                  </button>

                  <AnimatePresence>
                    {step === 'error' && errorMsg && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className='flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2.5'
                      >
                        <AlertCircle className='mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive' />
                        <p className='text-xs leading-relaxed text-destructive/90'>{errorMsg}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
