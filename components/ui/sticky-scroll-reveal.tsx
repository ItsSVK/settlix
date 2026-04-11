'use client'

import { useRef, useState } from 'react'
import { motion, useMotionValueEvent, useScroll } from 'motion/react'
import { cn } from '@/lib/utils'

interface StickyScrollItem {
  title: string
  description: string
  content?: React.ReactNode
}

export function StickyScrollReveal({
  content,
  contentClassName,
}: {
  content: StickyScrollItem[]
  contentClassName?: string
}) {
  const [activeCard, setActiveCard] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ container: ref, offset: ['start start', 'end start'] })
  const stops = content.map((_, i) => i / content.length)

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const closest = stops.reduce((prev, curr, i) => (Math.abs(curr - v) < Math.abs(stops[prev] - v) ? i : prev), 0)
    setActiveCard(closest)
  })

  return (
    <motion.div ref={ref} className='relative flex h-120 justify-center space-x-10 overflow-y-auto rounded-2xl p-8'>
      {/* Scrollable text left side */}
      <div className='relative flex-1 max-w-sm'>
        {content.map((item, i) => (
          <div key={i} className='mb-20 last:mb-0'>
            <motion.h3 animate={{ opacity: activeCard === i ? 1 : 0.3 }} className='text-xl font-bold text-foreground'>
              {item.title}
            </motion.h3>
            <motion.p
              animate={{ opacity: activeCard === i ? 0.8 : 0.2 }}
              className='mt-3 max-w-sm text-sm text-muted-foreground leading-relaxed'
            >
              {item.description}
            </motion.p>
          </div>
        ))}
      </div>

      {/* Sticky right side */}
      <div className={cn('sticky top-0 hidden h-60 w-72 overflow-hidden rounded-2xl lg:block', contentClassName)}>
        {content[activeCard]?.content}
      </div>
    </motion.div>
  )
}
