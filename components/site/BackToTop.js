'use client'
import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

export default function BackToTop() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className={`fixed bottom-[80px] right-6 z-40 w-10 h-10 rounded-full bg-white border border-[#E4E4E7] shadow-md flex items-center justify-center text-[#0D9488] hover:border-[#0D9488] hover:shadow-lg transition-all duration-300 ${show ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'}`}
    >
      <ArrowUp className="w-4 h-4" />
    </button>
  )
}
