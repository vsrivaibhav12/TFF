'use client'
import { useEffect, useState } from 'react'

export default function ProgressBar() {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    let ticking = false
    const update = () => {
      const h = document.documentElement
      const max = h.scrollHeight - h.clientHeight
      const p = max > 0 ? (h.scrollTop / max) * 100 : 0
      setWidth(p)
      ticking = false
    }
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update)
        ticking = true
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return <div className="tf-progress" style={{ width: `${width}%` }} aria-hidden="true" />
}
