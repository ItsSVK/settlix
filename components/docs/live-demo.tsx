'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion } from 'motion/react'
import { Zap, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Section } from './doc-section'
import { CheckoutOverlay } from './checkout-overlay'

type LogEntry = { type: 'open' | 'success' | 'close'; msg: string; time: string }

const LOG_COLOR: Record<LogEntry['type'], string> = {
  open: 'text-blue-400',
  success: 'text-emerald-400',
  close: 'text-orange-400',
}

function ts() {
  return new Date().toTimeString().slice(0, 8)
}

export function LiveDemo() {
  const [linkId, setLinkId] = useState('')
  const [log, setLog] = useState<LogEntry[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const saved = sessionStorage.getItem('settlix_test_link_id')
    if (saved) setLinkId(saved)
  }, [])

  function push(entry: LogEntry) {
    setLog((prev) => [...prev, entry])
  }

  function openCheckout() {
    const id = linkId.trim()
    if (!id) return
    sessionStorage.setItem('settlix_test_link_id', id)
    setActiveId(id)
    push({ type: 'open', msg: `Settlix.open({ linkId: "${id}" })`, time: ts() })
  }

  const handlePaid = useCallback((txSignature: string) => {
    push({ type: 'success', msg: `Payment confirmed — ${txSignature || '(none)'}`, time: ts() })
    setTimeout(() => setActiveId(null), 1800)
  }, [])

  function handleClose() {
    setActiveId(null)
    push({ type: 'close', msg: 'User closed checkout', time: ts() })
  }

  return (
    <>
      <Section
        id='live-demo'
        icon={Zap}
        title='Live Demo'
        subtitle='Enter your payment link ID and fire the checkout right here.'
      >
        <div className='rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-md'>
          <label className='mb-2.5 block text-sm font-medium text-foreground'>Payment Link ID</label>
          <div className='flex items-center gap-3 rounded-2xl border border-border/40 bg-muted/40 p-2 transition-all focus-within:border-indigo-500/40 dark:focus-within:border-indigo-400/40 focus-within:ring-2 focus-within:ring-indigo-500/10 dark:focus-within:ring-indigo-400/10'>
            <input
              value={linkId}
              onChange={(e) => setLinkId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && openCheckout()}
              placeholder='e.g. clxyz1234abcd'
              spellCheck={false}
              className='flex-1 bg-transparent px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/50'
            />
            <Button
              onClick={openCheckout}
              disabled={!linkId.trim()}
              className='rounded-xl bg-indigo-600 dark:bg-indigo-500 px-6 font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 dark:hover:bg-indigo-600 active:scale-[0.98]'
            >
              Open Checkout
            </Button>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='mt-2 ml-2 flex items-center gap-1.5 text-[12.5px] text-muted-foreground/80'
          >
            <Info className='h-3.5 w-3.5 shrink-0 text-indigo-500/70 dark:text-indigo-400/70' />
            <p>
              Sign in and create a payment link to get your Payment Link ID.{' '}
              <Link
                href='/dashboard/links'
                className='inline-flex items-center font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300'
              >
                Go to Dashboard
                <svg
                  className='ml-0.5 h-3.5 w-3.5'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                  strokeWidth={2.5}
                >
                  <path strokeLinecap='round' strokeLinejoin='round' d='M9 5l7 7-7 7' />
                </svg>
              </Link>
            </p>
          </motion.div>

          <div className='mt-8'>
            <div className='mb-2.5 flex items-center justify-between'>
              <span className='text-[11px] font-bold uppercase tracking-widest text-muted-foreground'>Event log</span>
              {log.length > 0 && (
                <Button
                  variant='ghost'
                  size='xss'
                  onClick={() => setLog([])}
                  className='text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors'
                >
                  Clear Log
                </Button>
              )}
            </div>
            <div className='min-h-[80px] rounded-xl border border-border/40 bg-zinc-950 p-4 font-mono text-[12px] leading-[1.8] shadow-inner'>
              {log.length === 0 ? (
                <span className='italic text-zinc-600'>Events will appear here…</span>
              ) : (
                <div className='space-y-1.5'>
                  {log.map((e, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className='flex gap-3'
                    >
                      <span className='shrink-0 text-zinc-500'>{e.time}</span>
                      <span className={`shrink-0 font-medium ${LOG_COLOR[e.type]}`}>[{e.type}]</span>
                      <span className='break-all text-zinc-300'>{e.msg}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Section>

      <CheckoutOverlay activeId={activeId} onClose={handleClose} onPaid={handlePaid} />
    </>
  )
}
