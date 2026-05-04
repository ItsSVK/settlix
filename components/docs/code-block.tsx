'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { copyText } from '@/lib/utils'

export function ColoredCode({ code }: { code: string }) {
  const tokens = code.split(
    /(\/\/.*|\b(?:function|const|let|var|return|if|else|console|document|window|interface|declare|global|type)\b|'.*?'|".*?"|\b\d+\b|[{}[\]()])/g,
  )

  return (
    <>
      {tokens.map((part, i) => {
        if (!part) return null
        if (part.startsWith('//'))
          return (
            <span key={i} className='text-zinc-500'>
              {part}
            </span>
          )
        if (
          [
            'function',
            'const',
            'let',
            'var',
            'return',
            'if',
            'else',
            'interface',
            'declare',
            'global',
            'type',
          ].includes(part)
        )
          return (
            <span key={i} className='text-pink-400'>
              {part}
            </span>
          )
        if (['console', 'document', 'window'].includes(part))
          return (
            <span key={i} className='text-blue-400'>
              {part}
            </span>
          )
        if (part.startsWith("'") || part.startsWith('"'))
          return (
            <span key={i} className='text-emerald-400'>
              {part}
            </span>
          )
        if (/^\d+$/.test(part))
          return (
            <span key={i} className='text-orange-400'>
              {part}
            </span>
          )
        if (['true', 'false', 'null', 'undefined'].includes(part))
          return (
            <span key={i} className='text-orange-400'>
              {part}
            </span>
          )
        if (['{', '}', '[', ']', '(', ')'].includes(part))
          return (
            <span key={i} className='text-zinc-400'>
              {part}
            </span>
          )
        return (
          <span key={i} className='text-zinc-300'>
            {part}
          </span>
        )
      })}
    </>
  )
}

export function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className='group relative rounded-2xl border border-border/40 bg-zinc-950 shadow-sm overflow-hidden transition-all hover:border-border/80'>
      <div className='flex items-center justify-between border-b border-white/10 bg-zinc-900/50 px-4 py-2.5'>
        <span className='text-[11px] font-semibold text-zinc-400 tracking-wider uppercase'>
          {label ?? 'javascript'}
        </span>
        <Button
          variant='ghost'
          size='xss'
          onClick={() => copyText(code, setCopied)}
          className='flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200'
        >
          {copied ? (
            <>
              <Check className='h-3.5 w-3.5 text-emerald-400' />
              <span className='text-emerald-400'>Copied</span>
            </>
          ) : (
            <>
              <Copy className='h-3.5 w-3.5' />
              Copy
            </>
          )}
        </Button>
      </div>
      <pre className='overflow-x-auto px-5 py-4 text-[13px] leading-[1.7] font-mono whitespace-pre'>
        <code>
          <ColoredCode code={code} />
        </code>
      </pre>
    </div>
  )
}
