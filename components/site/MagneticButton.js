'use client'
import Link from 'next/link'
import { useEffect, useRef } from 'react'

/**
 * MagneticButton — a Next.js Link that gently tracks the cursor on hover.
 * Honors prefers-reduced-motion (effect disabled). Touch devices are unaffected.
 *
 * Usage: <MagneticButton href="/contact" className="...">Start a Conversation</MagneticButton>
 */
export default function MagneticButton({ href, children, className = '', strength = 0.25, ...rest }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof window === 'undefined') return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    if (window.matchMedia?.('(hover: none)').matches) return

    let raf = 0
    const onMove = (e) => {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = (e.clientX - cx) * strength
      const dy = (e.clientY - cy) * strength
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`
      })
    }
    const onLeave = () => {
      cancelAnimationFrame(raf)
      el.style.transform = 'translate(0, 0)'
    }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(raf)
    }
  }, [strength])

  return (
    <Link
      ref={ref}
      href={href}
      className={`magnetic-button ${className}`}
      style={{ transition: 'transform 250ms cubic-bezier(0.22, 1, 0.36, 1), background-color 200ms ease, box-shadow 200ms ease', willChange: 'transform' }}
      {...rest}
    >
      {children}
    </Link>
  )
}
