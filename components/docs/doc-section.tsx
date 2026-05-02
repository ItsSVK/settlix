'use client'

import { motion } from 'motion/react'

interface SectionProps {
  id: string
  icon: React.ElementType
  title: string
  subtitle?: string
  children: React.ReactNode
}

export function Section({ id, icon: Icon, title, subtitle, children }: SectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5 }}
      id={id}
      className='scroll-mt-24 group relative rounded-3xl border border-border/40 bg-card/30 p-6 md:p-8 backdrop-blur-xl shadow-sm transition-all hover:bg-card/50 hover:shadow-md'
    >
      <div className='mb-6 flex items-start gap-4'>
        <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 dark:bg-indigo-400/10 ring-1 ring-indigo-500/20 dark:ring-indigo-400/20 transition-transform duration-300 group-hover:scale-110 group-hover:bg-indigo-500/15 dark:group-hover:bg-indigo-400/15'>
          <Icon className='h-5 w-5 text-indigo-500 dark:text-indigo-400' />
        </div>
        <div>
          <h2 className='text-xl font-semibold tracking-tight text-foreground'>{title}</h2>
          {subtitle && <p className='mt-1 text-sm text-muted-foreground'>{subtitle}</p>}
        </div>
      </div>
      {children}
    </motion.section>
  )
}
