'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  value: number
  duration?: number
  className?: string
  decimals?: number
}

export default function AnimatedNumber({ value, duration = 400, className = '', decimals = 0 }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)
  const rafRef = useRef<number>(0)
  const startTimeRef = useRef(0)

  useEffect(() => {
    const from = prevRef.current
    const to = value

    if (from === to) return

    const startTime = performance.now()
    startTimeRef.current = startTime

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = from + (to - from) * eased

      setDisplay(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.round(current))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        prevRef.current = to
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration, decimals])

  return <span className={className}>{decimals > 0 ? display.toFixed(decimals) : display}</span>
}
