'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { VersionedTransaction } from '@solana/web3.js'
import { GitFork, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface PartnerOwed {
  wallet: string
  owedRaw: string
}

interface PendingDistributions {
  executionIds: string[]
  executionCount: number
  partners: PartnerOwed[]
  totalOwedRaw: string
}

interface DistributeButtonProps {
  /** Called after a successful distribution so the dashboard can refresh */
  onDistributed: () => void
}

function rawToUsdc(raw: string): string {
  const n = Number(raw) / 1_000_000
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
}

function shorten(s: string, start = 4, end = 4) {
  return `${s.slice(0, start)}…${s.slice(-end)}`
}

type Step = 'idle' | 'fetching' | 'building' | 'signing' | 'sending' | 'confirming' | 'done' | 'error'

export function DistributeButton({ onDistributed }: DistributeButtonProps) {
  const { signTransaction, publicKey } = useWallet()
  const { connection } = useConnection()

  const [pending, setPending] = useState<PendingDistributions | null>(null)
  const [loadingPending, setLoadingPending] = useState(true)
  const [step, setStep] = useState<Step>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const loadPending = useCallback(async () => {
    try {
      const res = await fetch('/api/distribute', { credentials: 'include' })
      if (!res.ok) return
      const data: PendingDistributions = await res.json()
      setPending(data.partners.length > 0 ? data : null)
    } catch {
      // Silently ignore — not critical
    } finally {
      setLoadingPending(false)
    }
  }, [])

  useEffect(() => {
    loadPending()
  }, [loadPending])

  const distribute = async () => {
    if (!pending || !signTransaction || !publicKey) return

    setStep('building')
    setErrorMsg('')

    try {
      // 1. Build unsigned transaction
      const buildRes = await fetch('/api/distribute/build-tx', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partners: pending.partners }),
      })
      if (!buildRes.ok) {
        const d = await buildRes.json().catch(() => ({}))
        throw new Error(d.error ?? 'Failed to build transaction')
      }
      const { transaction: txBase64, lastValidBlockHeight } = await buildRes.json()

      // 2. Deserialize and sign
      setStep('signing')
      const txBytes = Buffer.from(txBase64, 'base64')
      const tx = VersionedTransaction.deserialize(txBytes)
      const signed = await signTransaction(tx)

      // 3. Send
      setStep('sending')
      const txSignature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      })

      // 4. Confirm
      setStep('confirming')
      const { blockhash } = await connection.getLatestBlockhash()
      await connection.confirmTransaction({ signature: txSignature, blockhash, lastValidBlockHeight }, 'confirmed')

      // 5. Mark as distributed in DB
      const confirmRes = await fetch('/api/distribute', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txSignature,
          executionIds: pending.executionIds,
        }),
      })
      if (!confirmRes.ok) {
        // Tx landed but DB update failed — not critical, show a warning
        toast.warning('Funds sent! Distribution record may take a moment to update.')
      } else {
        toast.success(
          `Distributed ${rawToUsdc(pending.totalOwedRaw)} USDC to ${pending.partners.length} partner${
            pending.partners.length > 1 ? 's' : ''
          }`,
        )
      }

      setStep('done')
      setPending(null)
      onDistributed()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setErrorMsg(msg)
      setStep('error')
      toast.error(msg)
    }
  }

  if (loadingPending || !pending) return null

  const totalUsdc = rawToUsdc(pending.totalOwedRaw)
  const isBusy = step !== 'idle' && step !== 'done' && step !== 'error'

  const stepLabel: Record<Step, string> = {
    idle: 'Pay Partners',
    fetching: 'Loading…',
    building: 'Building tx…',
    signing: 'Sign in wallet…',
    sending: 'Sending…',
    confirming: 'Confirming…',
    done: 'Done',
    error: 'Retry',
  }

  return (
    <div className='mb-6 overflow-hidden rounded-2xl border border-primary/20 bg-primary/3 backdrop-blur-xl shadow-sm transition-all hover:bg-primary/6 hover:shadow-md'>
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-3'>
        <div className='flex flex-row items-center gap-3 min-w-0 flex-1'>
          {/* Icon Badge */}
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20'>
            <GitFork className='h-4 w-4' />
          </div>

          {/* Text Info */}
          <div className='flex flex-col min-w-0 gap-0.5'>
            <div className='flex items-baseline gap-1.5'>
              <span className='text-lg font-bold text-foreground tracking-tight'>{totalUsdc}</span>
              <span className='text-[10px] font-semibold text-primary/80 uppercase tracking-wider'>USDC</span>
            </div>
            <p className='text-[11px] font-medium text-muted-foreground tracking-wide'>
              Pending distribution across {pending.executionCount} payment{pending.executionCount > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={distribute}
          disabled={isBusy || !signTransaction}
          size='sm'
          className='w-full sm:w-auto shrink-0 rounded-xl text-xs font-semibold shadow-sm transition-all hover:opacity-90 active:scale-[0.98]'
        >
          {isBusy && <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />}
          {step === 'done' && <CheckCircle2 className='mr-1.5 h-3.5 w-3.5' />}
          {stepLabel[step]}
        </Button>
      </div>

      {/* Partner breakdown footer */}
      <div className='border-t border-primary/10 bg-primary/2 px-4 py-3 flex flex-col gap-2'>
        <p className='text-[9px] font-bold uppercase tracking-wider text-primary/60'>
          Owed to {pending.partners.length} partner{pending.partners.length > 1 ? 's' : ''}
        </p>
        <div className='flex flex-wrap gap-2'>
          {pending.partners.map((p) => (
            <div
              key={p.wallet}
              className='flex items-center gap-1.5 rounded-md border border-primary/15 bg-background/50 px-2 py-1 shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
            >
              <span className='font-mono text-[10px] text-muted-foreground/80'>{shorten(p.wallet)}</span>
              <div className='h-2.5 w-px bg-primary/20' />
              <span className='text-xs font-bold text-foreground tracking-tight'>
                {rawToUsdc(p.owedRaw)} <span className='text-[9px] font-medium text-muted-foreground'>USDC</span>
              </span>
            </div>
          ))}
        </div>
        {/* {step === 'error' && errorMsg && (
          <div className='mt-1 flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-2.5 py-2 text-[11px] text-destructive'>
            <AlertCircle className='h-3.5 w-3.5 shrink-0' />
            <p className='font-medium'>{errorMsg}</p>
          </div>
        )} */}
      </div>
    </div>
  )
}
