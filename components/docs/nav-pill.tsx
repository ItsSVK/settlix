'use client'

import { motion } from 'motion/react'
import Link from 'next/link'

interface NavPillProps {
  href: string
  label: string
  isActive?: boolean
}

export function NavPill({ href, label, isActive }: NavPillProps) {
  return (
    <Link
      href={href}
      className={`relative flex items-center w-full rounded-xl px-3 h-10 text-sm tracking-wide transition-all duration-300 ease-out group ${
        isActive
          ? 'text-primary-foreground font-medium'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:translate-x-1'
      }`}
    >
      {isActive && (
        <motion.div
          layoutId='activeDocsPill'
          className='absolute inset-0 rounded-xl bg-primary shadow-md shadow-primary/20'
          initial={false}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 35,
          }}
        />
      )}
      <span className='relative z-10'>{label}</span>
    </Link>
  )
}
