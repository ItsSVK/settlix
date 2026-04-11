'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

export function BackgroundBeams({ className }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const paths = svg.querySelectorAll<SVGPathElement>('path[data-beam]')
    paths.forEach((path, i) => {
      const length = path.getTotalLength()
      path.style.strokeDasharray = `${length}`
      path.style.strokeDashoffset = `${length}`
      path.style.animation = `beam-draw ${2 + i * 0.4}s ease-out ${i * 0.3}s forwards`
    })
  }, [])

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <style>{`
        @keyframes beam-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes beam-fade {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
      <svg
        ref={svgRef}
        className='absolute inset-0 h-full w-full'
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 1200 800'
        preserveAspectRatio='xMidYMid slice'
      >
        <defs>
          <linearGradient id='beam-g1' x1='0%' y1='0%' x2='100%' y2='100%'>
            <stop offset='0%' stopColor='hsl(270,80%,60%)' stopOpacity='0' />
            <stop offset='50%' stopColor='hsl(270,80%,60%)' stopOpacity='0.8' />
            <stop offset='100%' stopColor='hsl(220,80%,60%)' stopOpacity='0' />
          </linearGradient>
          <linearGradient id='beam-g2' x1='100%' y1='0%' x2='0%' y2='100%'>
            <stop offset='0%' stopColor='hsl(220,80%,60%)' stopOpacity='0' />
            <stop offset='50%' stopColor='hsl(250,80%,65%)' stopOpacity='0.6' />
            <stop offset='100%' stopColor='hsl(270,80%,60%)' stopOpacity='0' />
          </linearGradient>
          <linearGradient id='beam-g3' x1='0%' y1='100%' x2='100%' y2='0%'>
            <stop offset='0%' stopColor='hsl(250,70%,50%)' stopOpacity='0' />
            <stop offset='50%' stopColor='hsl(270,80%,70%)' stopOpacity='0.5' />
            <stop offset='100%' stopColor='hsl(220,80%,60%)' stopOpacity='0' />
          </linearGradient>
        </defs>

        {/* Beam paths */}
        <path
          data-beam
          stroke='url(#beam-g1)'
          strokeWidth='1.5'
          fill='none'
          opacity='0.6'
          style={{ animation: 'beam-fade 4s ease-in-out 2.5s infinite' }}
          d='M-100 200 Q300 100 600 300 T1300 500'
        />
        <path
          data-beam
          stroke='url(#beam-g2)'
          strokeWidth='1'
          fill='none'
          opacity='0.4'
          style={{ animation: 'beam-fade 5s ease-in-out 3s infinite' }}
          d='M1300 100 Q800 300 500 200 T-100 600'
        />
        <path
          data-beam
          stroke='url(#beam-g1)'
          strokeWidth='0.8'
          fill='none'
          opacity='0.3'
          style={{ animation: 'beam-fade 6s ease-in-out 3.5s infinite' }}
          d='M200 -50 Q400 400 700 300 T1100 800'
        />
        <path
          data-beam
          stroke='url(#beam-g3)'
          strokeWidth='1.2'
          fill='none'
          opacity='0.5'
          style={{ animation: 'beam-fade 4.5s ease-in-out 4s infinite' }}
          d='M-50 700 Q300 500 600 600 T1350 200'
        />
        <path
          data-beam
          stroke='url(#beam-g2)'
          strokeWidth='0.6'
          fill='none'
          opacity='0.25'
          style={{ animation: 'beam-fade 7s ease-in-out 4.5s infinite' }}
          d='M600 -100 Q800 200 900 400 T1200 900'
        />
        <path
          data-beam
          stroke='url(#beam-g1)'
          strokeWidth='1'
          fill='none'
          opacity='0.35'
          style={{ animation: 'beam-fade 5.5s ease-in-out 5s infinite' }}
          d='M-200 400 Q100 600 400 500 T900 100'
        />
      </svg>
    </div>
  )
}
