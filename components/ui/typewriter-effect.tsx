'use client'

import { useEffect } from 'react'
import { motion, stagger, useAnimate } from 'motion/react'
import { cn } from '@/lib/utils'

interface Word {
  text: string
  className?: string
}

export function TypewriterEffect({
  words,
  className,
  cursorClassName,
}: {
  words: Word[]
  className?: string
  cursorClassName?: string
}) {
  const [scope, animate] = useAnimate()

  useEffect(() => {
    animate('span', { opacity: 1, y: 0 }, { duration: 0.2, delay: stagger(0.05), ease: 'easeOut' })
  }, [animate])

  const allChars = words.map((word, wi) => (
    <span key={wi} className='inline-block'>
      {word.text.split('').map((char, ci) => (
        <motion.span key={ci} initial={{ opacity: 0, y: 10 }} className={cn('inline-block', word.className)}>
          {char}
        </motion.span>
      ))}
      {wi < words.length - 1 && (
        <motion.span initial={{ opacity: 0 }} className='inline-block'>
          &nbsp;
        </motion.span>
      )}
    </span>
  ))

  return (
    <div ref={scope} className={cn('inline', className)}>
      {allChars}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.2 }}
        className={cn('ml-1 inline-block h-[1em] w-[2px] translate-y-[2px] rounded-full bg-primary', cursorClassName)}
      />
    </div>
  )
}
