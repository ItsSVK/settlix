'use client'

import { motion } from 'motion/react'
import { ArrowRight, Terminal, Webhook, ShieldCheck, Code2, FileCode, Zap } from 'lucide-react'
import { Section } from './doc-section'
import { Step } from './doc-step'
import { CodeBlock } from './code-block'
import { LiveDemo } from './live-demo'
import type { makeSnippets } from './snippets'

type Snippets = ReturnType<typeof makeSnippets>

interface EmbedSectionsProps {
  snippets: Snippets
}

export function EmbedHero() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <div className='mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 dark:border-indigo-400/20 bg-indigo-500/10 dark:bg-indigo-400/10 px-4 py-1.5 backdrop-blur-md'>
        <Zap className='h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400' />
        <span className='text-[12px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400'>
          Embed Docs
        </span>
      </div>
      <h1 className='text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.1] mb-6'>
        Accept Solana payments
        <br />
        <span className='text-muted-foreground'>on any website.</span>
      </h1>
      <p className='max-w-xl text-lg text-muted-foreground/80 leading-relaxed'>
        Drop one script tag and call{' '}
        <code className='rounded-md bg-muted/60 px-2 py-1 font-mono text-sm text-foreground border border-border/40'>
          Settlix.open()
        </code>
        . No SDK, no wallet libraries, no framework required.
      </p>

      <div className='mt-10 flex flex-wrap gap-3'>
        {['Load checkout.js', 'Buyer pays in the modal', 'onSuccess fires'].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className='flex items-center gap-3 rounded-full border border-border/40 bg-card/40 px-4 py-2 backdrop-blur-sm'
          >
            <span className='flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/15 dark:bg-indigo-400/15 text-[11px] font-bold text-indigo-600 dark:text-indigo-400'>
              {i + 1}
            </span>
            <span className='text-sm font-medium text-foreground'>{s}</span>
            {i < 2 && <ArrowRight className='h-4 w-4 text-muted-foreground/50 ml-1' />}
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export function EmbedSections({ snippets }: EmbedSectionsProps) {
  return (
    <>
      <Section
        id='embed-quick-start'
        icon={Terminal}
        title='Quick Start'
        subtitle='Two steps to a working checkout button.'
      >
        <div className='mt-8'>
          <Step n={1} title='Load the checkout script once — anywhere in your HTML'>
            <CodeBlock code={snippets.loadScript} label='html' />
          </Step>
          <Step n={2} title='Trigger the checkout from any button or link'>
            <CodeBlock code={snippets.basicButton} label='html' />
            <p className='mt-4 text-sm text-muted-foreground/80'>
              Replace{' '}
              <code className='rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-foreground border border-border/40'>
                YOUR_LINK_ID
              </code>{' '}
              with the ID from your Settlix dashboard.
            </p>
          </Step>
        </div>
      </Section>

      <LiveDemo />

      <Section id='full-api' icon={Code2} title='Full API Reference' subtitle='All options accepted by Settlix.open().'>
        <CodeBlock code={snippets.fullApi} label='javascript' />

        <div className='mt-6 overflow-hidden rounded-2xl border border-border/40 bg-card/30 shadow-sm'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-border/40 bg-muted/40'>
                {['Option', 'Type', 'Description'].map((h) => (
                  <th
                    key={h}
                    className='px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground'
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className='divide-y divide-border/30'>
              {[
                ['linkId', 'string', 'Required. Your payment link ID from the dashboard.'],
                ['metadata', 'object', 'Optional. Any JSON — echoed back in onSuccess and onClose.'],
                ['onSuccess', '(txSig, metadata) => void', 'Called when payment is confirmed on-chain.'],
                ['onClose', '(metadata) => void', 'Called on close, cancel, or failure.'],
              ].map(([opt, type, desc]) => (
                <tr key={opt} className='transition-colors hover:bg-muted/20'>
                  <td className='px-5 py-4 font-mono text-[13px] text-indigo-600 dark:text-indigo-400 font-medium'>
                    {opt}
                  </td>
                  <td className='px-5 py-4 font-mono text-[13px] text-muted-foreground'>{type}</td>
                  <td className='px-5 py-4 text-[13px] text-foreground/80 leading-relaxed'>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        id='order-tracking'
        icon={FileCode}
        title='Order Tracking'
        subtitle='How to map a payment back to a specific order and user.'
      >
        <div className='mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-600 dark:text-amber-200/80 leading-relaxed'>
          <strong className='text-amber-700 dark:text-amber-300'>Without metadata</strong> — you know a payment was made
          but not <em>which order</em> or <em>which user</em> triggered it. Two customers buying the same product
          produce identical webhook payloads except for{' '}
          <code className='font-mono text-amber-700/80 dark:text-amber-200'>txSignature</code> and{' '}
          <code className='font-mono text-amber-700/80 dark:text-amber-200'>userWallet</code>.
        </div>
        <CodeBlock code={snippets.metadataExplained} label='javascript' />
        <p className='mt-4 text-[13px] text-muted-foreground/80 leading-relaxed'>
          <code className='rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-foreground border border-border/40'>
            metadata
          </code>{' '}
          is stored alongside the transaction in Settlix and included in every webhook delivery — so your backend can
          correlate without relying solely on the client-side callback.
        </p>
      </Section>

      <Section
        id='embed-webhooks'
        icon={Webhook}
        title='Webhook Payload'
        subtitle='Settlix sends a signed POST to your endpoint on every confirmed payment.'
      >
        <CodeBlock code={snippets.webhookPayload} label='json' />
        <div className='mt-6 rounded-2xl border border-indigo-500/20 dark:border-indigo-400/20 bg-indigo-500/5 dark:bg-indigo-400/5 p-5 text-sm'>
          <p className='font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-2'>
            <ShieldCheck className='h-4 w-4' /> Verifying the signature
          </p>
          <p className='mt-2 text-muted-foreground leading-relaxed'>
            Compute{' '}
            <code className='font-mono text-foreground bg-background rounded px-1 border border-border/40'>
              HMAC-SHA256(body, webhookSecret)
            </code>{' '}
            and compare it to the hex value in{' '}
            <code className='font-mono text-foreground bg-background rounded px-1 border border-border/40'>
              X-Settlix-Signature
            </code>
            . Reject the request if they don&apos;t match.
          </p>
        </div>
      </Section>

      <Section
        id='csp'
        icon={ShieldCheck}
        title='Content Security Policy'
        subtitle='Add these directives if your site sets a CSP header.'
      >
        <CodeBlock code={snippets.csp} label='http header' />
        <p className='mt-4 text-[13px] text-muted-foreground/80'>
          <code className='rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-foreground border border-border/40'>
            frame-src
          </code>{' '}
          allows the checkout iframe.{' '}
          <code className='rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-foreground border border-border/40'>
            connect-src
          </code>{' '}
          allows API calls made from inside the iframe.
        </p>
      </Section>

      <Section
        id='typescript'
        icon={Code2}
        title='TypeScript'
        subtitle='Add types for window.Settlix — no npm package needed.'
      >
        <CodeBlock code={snippets.typescript} label='typescript' />
      </Section>

      <Section
        id='async'
        icon={Terminal}
        title='Async Script Loading'
        subtitle='Queue calls made before the script finishes loading.'
      >
        <CodeBlock code={snippets.async} label='html' />
        <p className='mt-4 text-[13px] text-muted-foreground/80 leading-relaxed'>
          If you load the script with{' '}
          <code className='rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-foreground border border-border/40'>
            async
          </code>
          , calls to{' '}
          <code className='rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-foreground border border-border/40'>
            Settlix.open()
          </code>{' '}
          before the script executes will be queued and replayed automatically.
        </p>
      </Section>
    </>
  )
}
