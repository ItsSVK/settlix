import { clsx, type ClassValue } from 'clsx'
import { toast } from 'sonner'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function shorten(addr: string, start = 6, end = 4): string {
  return `${addr.slice(0, start)}…${addr.slice(-end)}`
}

function fallbackCopyText(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'
  document.body.appendChild(textarea)
  textarea.select()
  textarea.setSelectionRange(0, text.length)
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  return copied
}

export const copyText = async (text: string, setCopied: (copied: boolean) => void) => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const copied = fallbackCopyText(text)
      if (!copied) throw new Error('Copy not supported on this browser')
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Could not copy')
  }
}

export function formatRevenue(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}
