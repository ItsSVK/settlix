'use client'

import { useRef } from 'react'
import { motion, useAnimationFrame, useMotionTemplate, useMotionValue, useTransform } from 'motion/react'
import { cn } from '@/lib/utils'

interface MovingBorderProps {
  children: React.ReactNode
  duration?: number
  className?: string
  containerClassName?: string
  borderClassName?: string
  as?: React.ElementType
  [key: string]: unknown
}

export function MovingBorder({
  children,
  duration = 2000,
  className,
  containerClassName,
  borderClassName,
  as: Component = 'button',
  ...otherProps
}: MovingBorderProps) {
  const pathRef = useRef<SVGRectElement>(null)
  const progress = useMotionValue(0)

  useAnimationFrame((time) => {
    const length = pathRef.current?.getTotalLength?.() ?? 400
    if (length) {
      progress.set((time * (length / duration)) % length)
    }
  })

  const x = useTransform(progress, (v) => pathRef.current?.getPointAtLength?.(v)?.x ?? 0)
  const y = useTransform(progress, (v) => pathRef.current?.getPointAtLength?.(v)?.y ?? 0)
  const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateX(-50%) translateY(-50%)`

  return (
    <Component className={cn('relative overflow-hidden rounded-xl p-px', containerClassName)} {...otherProps}>
      <div className='absolute inset-0'>
        <svg className='absolute h-full w-full' xmlns='http://www.w3.org/2000/svg'>
          <rect ref={pathRef} fill='none' width='100%' height='100%' rx='12' ry='12' />
        </svg>
        <motion.div
          style={{ transform, opacity: 0.85 }}
          className={cn(
            'absolute h-10 w-10 rounded-full bg-[radial-gradient(circle_at_center,hsl(270,80%,70%)_0%,transparent_70%)]',
            borderClassName,
          )}
        />
      </div>
      <div className={cn('relative z-10 rounded-[11px] bg-background', className)}>{children}</div>
    </Component>
  )
}
