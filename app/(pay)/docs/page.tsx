'use client'

import { useState, useEffect } from 'react'
import { makeSnippets, makeApiSnippets } from '@/components/docs/snippets'
import { DocsSidebar } from '@/components/docs/docs-sidebar'
import { EmbedHero, EmbedSections } from '@/components/docs/embed-sections'
import { RestApiHero, RestApiSections } from '@/components/docs/rest-api-sections'

export default function DocsPage() {
  const [origin, setOrigin] = useState('https://settlix.xyz')
  useEffect(() => { setOrigin(window.location.origin) }, [])

  const snippets = makeSnippets(origin)
  const apiSnippets = makeApiSnippets(origin)

  return (
    <div className='min-h-screen bg-background relative overflow-hidden'>
      <div className='mx-auto max-w-6xl px-6 py-16 lg:flex lg:gap-16 relative z-10'>
        <DocsSidebar />

        <main className='min-w-0 flex-1 space-y-16 pb-24 pt-16'>
          <EmbedHero />
          <EmbedSections snippets={snippets} />

          <div className='my-24 h-px w-full bg-border/50' />

          <RestApiHero />
          <RestApiSections apiSnippets={apiSnippets} />
        </main>
      </div>
    </div>
  )
}
