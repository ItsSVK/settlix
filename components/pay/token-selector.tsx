'use client'

/**
 * Token selector with virtualization-ready architecture.
 *
 * Token data source:
 * - `lib/tokens/tokens.ts` re-exports `lib/tokens/tokens.json` as `TOKENS`.
 * - Update `tokens.json` to change the available list.
 *
 * For large lists (1000+ tokens), add @tanstack/virtual:
 * bun add @tanstack/react-virtual
 * Then wrap the filtered list items in a virtualizer inside the dropdown.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TOKENS } from '@/lib/tokens/tokens'

export interface TokenInfo {
  symbol: string
  name: string
  mint: string
  decimals: number
  logoURI?: string
}

interface TokenSelectorProps {
  selected: TokenInfo | null
  onChange: (token: TokenInfo) => void
  className?: string
}

function TokenLogo({ token }: { token: TokenInfo }) {
  if (token.logoURI) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={token.logoURI} alt={token.symbol} width={28} height={28} className='h-7 w-7 rounded-full' />
    )
  } else {
    return (
      <div className='flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-bold text-muted-foreground'>
        {token.symbol.slice(0, 2)}
      </div>
    )
  }
}

export function TokenSelector({ selected, onChange, className }: TokenSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tokens: TokenInfo[] = TOKENS

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Focus search on open
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  const filtered = tokens.filter(
    (t) =>
      !search ||
      t.symbol.toLowerCase().includes(search.toLowerCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.mint.toLowerCase().includes(search.toLowerCase()),
  )

  const select = useCallback(
    (token: TokenInfo) => {
      onChange(token)
      setOpen(false)
      setSearch('')
    },
    [onChange],
  )

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className='flex w-full items-center gap-2.5 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-left transition-colors hover:bg-muted/60'
      >
        {selected ? (
          <>
            <TokenLogo token={selected} />
            <div className='flex-1'>
              <p className='text-sm font-semibold text-foreground'>{selected.symbol}</p>
              <p className='font-mono text-[10px] text-muted-foreground'>{selected.mint.slice(0, 8)}…</p>
            </div>
          </>
        ) : (
          <span className='flex-1 text-sm text-muted-foreground'>Select token…</span>
        )}
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className='absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-border/60 bg-popover shadow-xl'>
          {/* Search */}
          <div className='flex items-center gap-2 border-b border-border/40 px-3 py-2'>
            <Search className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search by name or address…'
              className='flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground'
            />
          </div>

          {/*
           * List — this is the swap-in point for virtualisation.
           * When tokens.json has 1000+ entries, replace this <div> with
           * a @tanstack/react-virtual <div ref={parentRef}> + virtualItems.map(...)
           */}
          <div className='max-h-56 overflow-y-auto'>
            {filtered.length === 0 ? (
              <p className='py-6 text-center text-sm text-muted-foreground'>No tokens found</p>
            ) : (
              filtered.map((token) => (
                <button
                  key={token.mint}
                  onClick={() => select(token)}
                  className='flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-accent'
                >
                  <TokenLogo token={token} />
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-semibold text-foreground'>{token.symbol}</p>
                    <p className='truncate font-mono text-[10px] text-muted-foreground'>{token.mint.slice(0, 16)}…</p>
                  </div>
                  {selected?.mint === token.mint && <Check className='h-4 w-4 shrink-0 text-primary' />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
