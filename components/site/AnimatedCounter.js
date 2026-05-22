'use client'
import { useEffect, useRef, useState } from 'react'

export default function AnimatedCounter({ value, prefix = '', suffix = '', duration = 1600, decimals = 0, className = '' }) {
  const ref = useRef(null)
  const [n, setN] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started) {
        setStarted(true)
        const start = performance.now()
        const animate = (t) => {
          const p = Math.min(1, (t - start) / duration)
          // easeOutCubic
          const eased = 1 - Math.pow(1 - p, 3)
          setN(value * eased)
          if (p < 1) requestAnimationFrame(animate)
        }
        requestAnimationFrame(animate)
        obs.disconnect()
      }
    }, { threshold: 0.4 })
    obs.observe(node)
    return () => obs.disconnect()
  }, [value, duration, started])

  const formatted = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString()
  return <span ref={ref} className={className}>{prefix}{formatted}{suffix}</span>
}
