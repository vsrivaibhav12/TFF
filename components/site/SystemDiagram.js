'use client'
import { useEffect, useRef, useState } from 'react'
import { TrendingUp, AlertCircle, FileText, Activity, CheckCircle2 } from 'lucide-react'

function useInView(threshold = 0.2) {
  const ref = useRef(null)
  const [v, setV] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); obs.disconnect() } }, { threshold })
    obs.observe(node)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, v]
}

export function ScatteredDashboard() {
  const [ref, inView] = useInView(0.2)
  const cards = [
    { title: 'GST Status', icon: FileText, body: <><span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-2" />Delayed</>, rot: -3, x: '-2%', y: '4%' },
    { title: 'Cash Flow', icon: TrendingUp, body: null, sparkline: 'flat', rot: 2, x: '46%', y: '0%' },
    { title: 'Receivables', icon: Activity, body: <span className="text-[#A1A1AA]">₹—</span>, rot: -2, x: '4%', y: '52%' },
    { title: 'Compliance', icon: AlertCircle, body: <><span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-2" />3 overdue</>, rot: 3, x: '54%', y: '54%' },
  ]
  return (
    <div ref={ref} className="relative w-full max-w-[480px] aspect-[1/0.95] mx-auto">
      <div className="absolute inset-0 dot-grid-faint rounded-2xl opacity-60" />
      {cards.map((c, i) => {
        const Icon = c.icon
        return (
          <div
            key={c.title}
            className="absolute w-[46%] rounded-xl p-3 bg-white/85 backdrop-blur-sm border border-[#E4E4E7]"
            style={{
              left: c.x, top: c.y,
              transform: inView ? `rotate(${c.rot}deg) translateY(0)` : `rotate(${c.rot}deg) translateY(20px)`,
              opacity: inView ? 1 : 0,
              transition: `opacity 600ms ${i * 100}ms ease-out, transform 600ms ${i * 100}ms ease-out`,
              filter: 'grayscale(0.15)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold">{c.title}</span>
              <Icon className="w-3 h-3 text-[#A1A1AA]" />
            </div>
            {c.sparkline === 'flat' ? (
              <svg viewBox="0 0 120 28" className="mt-2 w-full h-7">
                <path d="M2 14 L 118 14" stroke="#D4D4D8" strokeWidth="1.5" strokeDasharray="3 4" fill="none" />
              </svg>
            ) : (
              <div className="mt-2 text-[13px] font-medium text-[#71717A]">{c.body}</div>
            )}
            <div className="mt-2 h-1 w-1/3 rounded-full bg-[#E4E4E7]" />
          </div>
        )
      })}
      {[{ x: '46%', y: '24%' }, { x: '24%', y: '50%' }, { x: '70%', y: '46%' }].map((d, i) => (
        <span key={i} className="absolute w-1.5 h-1.5 rounded-full bg-red-300" style={{ left: d.x, top: d.y, opacity: inView ? 0.85 : 0, transition: `opacity 500ms ${500 + i * 120}ms` }} />
      ))}
    </div>
  )
}

export function UnifiedDashboard() {
  const [ref, inView] = useInView(0.2)
  return (
    <div ref={ref} className="relative w-full max-w-[480px] aspect-[1/0.95] mx-auto">
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-2.5 p-1">
        {[
          { title: 'GST Status', icon: FileText, body: <><CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] mr-1.5" /> <span className="text-[#18181B] font-semibold text-[13px]">Filed — 17 Apr</span></> },
          { title: 'Cash Flow', icon: TrendingUp, body: <Sparkline /> },
          { title: 'Receivables', icon: Activity, body: <span className="text-[20px] font-bold text-[#0D9488] tracking-tight">₹24.3L</span> },
          { title: 'Compliance', icon: CheckCircle2, body: <><CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] mr-1.5" /> <span className="text-[#18181B] font-semibold text-[13px]">All clear</span></> },
        ].map((c, i) => {
          const Icon = c.icon
          return (
            <div
              key={c.title}
              className="rounded-xl p-3 bg-white border border-[#E4E4E7] flex flex-col"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(14px)',
                transition: `opacity 500ms ${i * 100}ms ease-out, transform 500ms ${i * 100}ms ease-out`,
                boxShadow: '0 1px 2px rgba(13, 148, 136, 0.04)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-[#0D9488] font-bold">{c.title}</span>
                <Icon className="w-3 h-3 text-[#0D9488]" />
              </div>
              <div className="mt-2 flex items-center text-[13px] flex-1">{c.body}</div>
              <div className="mt-2 h-1 w-full rounded-full bg-[#F0FDFA] overflow-hidden">
                <div className="h-full bg-[#0D9488]" style={{ width: inView ? '72%' : '0%', transition: `width 1s ${500 + i * 100}ms ease-out` }} />
              </div>
            </div>
          )
        })}
      </div>
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 95" preserveAspectRatio="none">
        <g stroke="#0D9488" strokeOpacity="0.35" strokeWidth="0.3" fill="none">
          <path d="M50 24 L 50 71" className={`draw-path ${inView ? 'is-visible' : ''}`} style={{ '--dash': '60', animationDelay: '700ms' }} />
          <path d="M26 47.5 L 74 47.5" className={`draw-path ${inView ? 'is-visible' : ''}`} style={{ '--dash': '60', animationDelay: '950ms' }} />
        </g>
        <circle cx="50" cy="47.5" r="1.2" fill="#0D9488" style={{ opacity: inView ? 1 : 0, transition: 'opacity 400ms 1500ms' }} />
      </svg>
    </div>
  )
}

function Sparkline() {
  return (
    <svg viewBox="0 0 120 32" className="w-full h-7">
      <defs>
        <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0D9488" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#0D9488" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M2 22 L 22 18 L 42 20 L 62 12 L 82 14 L 102 8 L 118 4 L 118 32 L 2 32 Z" fill="url(#sparkFill)" />
      <path d="M2 22 L 22 18 L 42 20 L 62 12 L 82 14 L 102 8 L 118 4" stroke="#0D9488" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="118" cy="4" r="2.2" fill="#0D9488" />
    </svg>
  )
}
