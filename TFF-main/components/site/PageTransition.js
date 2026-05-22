'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * PageTransition — fades the page in on route change.
 * Honors prefers-reduced-motion.
 */
export default function PageTransition({ children }) {
  const pathname = usePathname()
  const [phase, setPhase] = useState('in')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setPhase('in')
      return
    }
    setPhase('enter')
    const t = requestAnimationFrame(() => setPhase('in'))
    return () => cancelAnimationFrame(t)
  }, [pathname])

  return (
    <div className={`page-transition page-transition-${phase}`}>
      {children}
    </div>
  )
}
