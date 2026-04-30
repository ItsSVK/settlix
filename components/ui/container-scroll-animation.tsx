'use client'
import React, { useRef } from 'react'
import { useReducedMotion, useScroll, useTransform, motion, type MotionValue } from 'motion/react'

const cardShadow =
  '0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003'

export const ContainerScroll = ({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode
  children: React.ReactNode
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })
  const [isMobile, setIsMobile] = React.useState(false)
  const shouldReduceMotion = useReducedMotion()

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  const scaleDimensions = () => {
    return isMobile ? [0.78, 0.92, 1] : [0.84, 0.96, 1]
  }

  const rotate = useTransform(scrollYProgress, [0, 0.4, 0.72], [20, 8, 0])
  const scale = useTransform(scrollYProgress, [0, 0.4, 0.72], scaleDimensions())
  const translate = useTransform(scrollYProgress, [0, 0.42, 0.72], [0, -48, -96])
  const headerOpacity = useTransform(scrollYProgress, [0, 0.44, 0.72], [1, 1, 0.32])
  const width = useTransform(
    scrollYProgress,
    [0, 0.42, 0.72],
    isMobile ? ['92vw', '96vw', '100dvw'] : ['72vw', '86vw', '100dvw'],
  )
  const height = useTransform(
    scrollYProgress,
    [0, 0.42, 0.72],
    isMobile ? ['32rem', '74dvh', '100dvh'] : ['42rem', '76dvh', '100dvh'],
  )
  const padding = useTransform(
    scrollYProgress,
    [0, 0.5, 0.72],
    isMobile ? ['8px', '8px', '0px'] : ['24px', '16px', '0px'],
  )
  const borderRadius = useTransform(scrollYProgress, [0, 0.5, 0.72], ['30px', '24px', '0px'])
  const innerRadius = useTransform(scrollYProgress, [0, 0.5, 0.72], ['18px', '14px', '0px'])
  const borderOpacity = useTransform(scrollYProgress, [0, 0.62, 0.72], [1, 0.7, 0])

  return (
    <div className='relative h-[280vh] w-full' ref={containerRef}>
      <div
        className='sticky top-0 flex h-screen w-screen items-center justify-center overflow-hidden py-8'
        style={{
          perspective: '2500px',
        }}
      >
        <Header
          opacity={shouldReduceMotion ? undefined : headerOpacity}
          translate={shouldReduceMotion ? undefined : translate}
          titleComponent={titleComponent}
        />
        <Card
          borderOpacity={shouldReduceMotion ? undefined : borderOpacity}
          borderRadius={shouldReduceMotion ? undefined : borderRadius}
          height={shouldReduceMotion ? undefined : height}
          innerRadius={shouldReduceMotion ? undefined : innerRadius}
          padding={shouldReduceMotion ? undefined : padding}
          rotate={shouldReduceMotion ? undefined : rotate}
          scale={shouldReduceMotion ? undefined : scale}
          width={shouldReduceMotion ? undefined : width}
        >
          {children}
        </Card>
      </div>
    </div>
  )
}

export const Header = ({
  opacity,
  translate,
  titleComponent,
}: {
  opacity?: MotionValue<number>
  translate?: MotionValue<number>
  titleComponent: string | React.ReactNode
}) => {
  return (
    <motion.div
      style={{
        opacity,
        translateY: translate,
      }}
      className='pointer-events-none absolute left-1/2 top-20 z-10 w-full max-w-5xl -translate-x-1/2 px-4 text-center min-[900px]:top-16 xl:top-12'
    >
      {titleComponent}
    </motion.div>
  )
}

export const Card = ({
  borderOpacity,
  borderRadius,
  height,
  innerRadius,
  padding,
  rotate,
  scale,
  width,
  children,
}: {
  borderOpacity?: MotionValue<number>
  borderRadius?: MotionValue<string>
  height?: MotionValue<string>
  innerRadius?: MotionValue<string>
  padding?: MotionValue<string>
  rotate?: MotionValue<number>
  scale?: MotionValue<number>
  width?: MotionValue<string>
  children: React.ReactNode
}) => {
  return (
    <motion.div
      style={{
        borderRadius,
        height,
        padding,
        rotateX: rotate,
        scale,
        width,
        boxShadow: cardShadow,
      }}
      className='relative z-20 mx-auto h-128 w-[92vw] max-w-none shrink-0 overflow-hidden border border-primary/20 bg-background/55 p-2 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-xl md:h-168 md:w-[72vw] md:p-6'
    >
      <motion.div
        aria-hidden='true'
        style={{ opacity: borderOpacity }}
        className='pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-primary/20'
      />
      <motion.div
        style={{ borderRadius: innerRadius }}
        className='flex h-full w-full items-center justify-center overflow-hidden bg-background'
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
