'use client'

import { useState, useEffect } from 'react'
import { NavPill } from './nav-pill'

const EMBED_NAV = [
  { href: '#embed-quick-start', label: 'Quick Start' },
  { href: '#live-demo', label: 'Live Demo' },
  { href: '#full-api', label: 'Full API' },
  { href: '#order-tracking', label: 'Order Tracking' },
  { href: '#embed-webhooks', label: 'Webhooks' },
  { href: '#csp', label: 'CSP' },
  { href: '#typescript', label: 'TypeScript' },
  { href: '#async', label: 'Async Loading' },
]

const REST_NAV = [
  { href: '#authentication', label: 'Authentication' },
  { href: '#api-quick-start', label: 'Quick Start' },
  { href: '#api-keys', label: 'API Keys' },
  { href: '#create-link', label: 'Create Link' },
  { href: '#list-links', label: 'List Links' },
  { href: '#manage-link', label: 'Manage a Link' },
  { href: '#invoices', label: 'Invoices' },
  { href: '#api-webhooks', label: 'Webhooks' },
  { href: '#errors', label: 'Errors' },
]

export function DocsSidebar() {
  const [activeSection, setActiveSection] = useState('embed-quick-start')

  useEffect(() => {
    const activeSections = new Set<string>()

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) activeSections.add(entry.target.id)
          else activeSections.delete(entry.target.id)
        })

        const ordered = Array.from(document.querySelectorAll('section[id]')).map((s) => s.id)
        const topMost = ordered.find((id) => activeSections.has(id))
        if (topMost) setActiveSection(topMost)
      },
      { rootMargin: '-10% 0px -50% 0px' },
    )

    document.querySelectorAll('section[id]').forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  return (
    <aside className='hidden lg:block w-56 shrink-0 relative'>
      <div className='fixed top-24 w-56 max-h-[calc(100vh-8rem)] overflow-y-auto pr-4'>
        <p className='mb-4 px-4 text-xs font-bold uppercase tracking-widest text-muted-foreground'>Embed SDK</p>
        <nav className='flex flex-col gap-1 mb-8'>
          {EMBED_NAV.map(({ href, label }) => (
            <NavPill key={href} href={href} label={label} isActive={activeSection === href.slice(1)} />
          ))}
        </nav>

        <p className='mb-4 px-4 text-xs font-bold uppercase tracking-widest text-muted-foreground'>REST API</p>
        <nav className='flex flex-col gap-1'>
          {REST_NAV.map(({ href, label }) => (
            <NavPill key={href} href={href} label={label} isActive={activeSection === href.slice(1)} />
          ))}
        </nav>
      </div>
    </aside>
  )
}
