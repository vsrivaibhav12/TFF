'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Shield, BarChart3, BarChart, Lock, ArrowRight } from 'lucide-react'

const layers = [
  {
    num: '04',
    icon: Lock,
    headline: 'Make every process provable.',
    subhead: 'Every transaction traceable. Every approval logged. Audit-ready by default.',
    serviceLabel: 'Process & Controls',
    serviceTagline: 'SOX/ICFR-grade controls, mapped and tested.',
    href: '/process-controls',
    bg: 'linear-gradient(135deg, #0F766E 0%, #134E4A 100%)',
    text: '#FFFFFF',
    sub: 'rgba(255,255,255,0.78)',
    width: 78,
  },
  {
    num: '03',
    icon: BarChart3,
    headline: 'Turn numbers into decisions.',
    subhead: 'A CA who reads your dashboard with you and tells you what to do next.',
    serviceLabel: 'Virtual CFO',
    serviceTagline: 'Monthly insight memo, quarterly strategy session.',
    href: '/virtual-cfo',
    bg: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
    text: '#FFFFFF',
    sub: 'rgba(255,255,255,0.78)',
    width: 85,
  },
  {
    num: '02',
    icon: BarChart,
    headline: 'See where money actually flows.',
    subhead: 'Profitability, working capital, cash flow - visible every month, not at year-end.',
    serviceLabel: 'BizLens Analytics',
    serviceTagline: 'Proprietary engine. Refreshed monthly.',
    href: '/virtual-cfo',
    bg: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
    text: '#FFFFFF',
    sub: 'rgba(255,255,255,0.78)',
    width: 92,
  },
  {
    num: '01',
    icon: Shield,
    headline: 'Get compliance off your plate - for good.',
    subhead: 'GST, TDS, Income Tax - handled together, tracked live, never out of sync.',
    serviceLabel: 'Compliance as a Service',
    serviceTagline: 'One handoff. Everything stays aligned.',
    href: '/compliance',
    bg: 'linear-gradient(135deg, #99F6E4 0%, #5EEAD4 100%)',
    text: '#0F172A',
    sub: 'rgba(15,23,42,0.65)',
    width: 100,
  },
]

export default function LayeredServices() {
  const [hoveredIdx, setHoveredIdx] = useState(null)
  const wrapperRef = useRef(null)
  const layerRefs = useRef([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    let raf = 0
    const onScroll = () => {
      const node = wrapperRef.current
      if (!node) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect()
        const vh = window.innerHeight || 800
        const progress = 1 - Math.min(1, Math.max(0, (rect.top + rect.height * 0.5) / vh))
        const offset = (progress - 0.5) * 12
        layerRefs.current.forEach((el, i) => {
          if (!el) return
          const sign = i < layers.length / 2 ? -1 : 1
          const mag = Math.abs(i - (layers.length - 1) / 2)
          el.style.transform = 'translateY(' + (sign * mag * offset * 0.45).toFixed(2) + 'px)'
        })
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div ref={wrapperRef} className="relative max-w-3xl mx-auto">
      <div
        className="absolute left-1/2 -translate-x-1/2 hidden md:block"
        style={{
          bottom: -18,
          width: '92%',
          height: 28,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(13,148,136,0.16) 0%, transparent 70%)',
          filter: 'blur(6px)',
        }}
        aria-hidden
      />

      <div className="relative flex flex-col items-stretch md:items-center pr-0 md:pr-12">
        {layers.map((l, i) => {
          const Icon = l.icon
          const expanded = hoveredIdx === i
          const isTopOfHover = hoveredIdx !== null && i < hoveredIdx
          const lift = expanded ? -4 : isTopOfHover ? -8 : 0
          const isLight = l.text === '#FFFFFF'

          return (
            <Link
              key={l.serviceLabel + l.num}
              ref={(el) => { layerRefs.current[i] = el }}
              href={l.href}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onFocus={() => setHoveredIdx(i)}
              onBlur={() => setHoveredIdx(null)}
              className="group relative block transition-transform duration-300 ease-out layered-stack-parallax"
              style={{
                width: l.width + '%',
                marginTop: i === 0 ? 0 : -10,
                zIndex: 10 + (layers.length - i),
              }}
            >
              <div
                className="relative rounded-2xl px-5 sm:px-7 py-5 transition-all duration-300 ease-out"
                style={{
                  background: l.bg,
                  color: l.text,
                  transform: 'translateY(' + lift + 'px)',
                  boxShadow: expanded
                    ? '0 ' + (24 + (layers.length - i) * 6) + 'px ' + (42 + (layers.length - i) * 8) + 'px -16px rgba(13, 148, 136, 0.55), 0 4px 8px -4px rgba(15, 23, 42, 0.18)'
                    : '0 ' + (10 + (layers.length - i) * 4) + 'px ' + (22 + (layers.length - i) * 4) + 'px -14px rgba(13, 148, 136, 0.42), 0 2px 4px -2px rgba(15, 23, 42, 0.12)',
                  borderTop: isLight ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(15,23,42,0.10)',
                  borderBottom: isLight ? '1px solid rgba(0,0,0,0.18)' : '1px solid rgba(15,23,42,0.08)',
                }}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-3 top-0 h-px rounded-full"
                  style={{ background: isLight ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.7)' }}
                />

                <div className="flex items-start gap-3 sm:gap-4">
                  <span
                    className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-bold tracking-wide mt-0.5"
                    style={{
                      border: '1px solid ' + (isLight ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.25)'),
                      color: l.text,
                      background: isLight ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.06)',
                    }}
                  >
                    {l.num}
                  </span>
                  <Icon className="w-5 h-5 flex-shrink-0 mt-3" style={{ color: l.text }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-[16px] sm:text-[18px] tracking-[-0.01em] leading-[1.2]" style={{ color: l.text }}>
                      {l.headline}
                    </p>
                    <p className="text-[13px] sm:text-[14px] mt-1 leading-snug" style={{ color: l.sub }}>
                      {l.subhead}
                    </p>

                    <div
                      className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 transition-all duration-300"
                      style={{
                        opacity: expanded ? 1 : 0,
                        maxHeight: expanded ? '60px' : '0px',
                        overflow: 'hidden',
                      }}
                    >
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-[0.18em] font-bold"
                        style={{
                          background: isLight ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.10)',
                          color: l.text,
                        }}
                      >
                        Our service
                      </span>
                      <span className="text-[14px] sm:text-[15px] font-semibold" style={{ color: l.text }}>
                        {l.serviceLabel}
                      </span>
                      <span className="text-[12px] sm:text-[13px]" style={{ color: l.sub }}>
                        - {l.serviceTagline}
                      </span>
                    </div>
                  </div>

                  <span
                    className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap mt-1.5 self-start opacity-80 group-hover:opacity-100"
                    style={{ color: l.text }}
                  >
                    {expanded ? 'See more' : 'Hover'}
                    <ArrowRight className={'w-3.5 h-3.5 transition-transform ' + (expanded ? 'translate-x-1' : '')} />
                  </span>
                </div>
              </div>

              <div
                aria-hidden
                className="pointer-events-none absolute left-2 right-2 -bottom-[3px] h-[6px] rounded-b-2xl opacity-80"
                style={{
                  background: isLight ? 'linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0))' : 'linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0))',
                }}
              />
            </Link>
          )
        })}
      </div>

      <div className="absolute top-0 bottom-0 right-0 hidden md:flex items-stretch" aria-hidden>
        <div
          className="relative w-1.5 rounded-full bg-gradient-to-b from-[#5EEAD4] via-[#0D9488] to-[#0F766E]"
          style={{ boxShadow: '0 0 22px rgba(13, 148, 136, 0.55)' }}
        />
        <div
          className="absolute -right-1 top-1/2 -translate-y-1/2 translate-x-full ml-2 bg-[#0D9488] text-white text-[10px] tracking-[0.2em] uppercase font-semibold px-2 py-1.5 rounded-md whitespace-nowrap shadow-[0_4px_14px_-4px_rgba(13,148,136,0.55)]"
          style={{ writingMode: 'vertical-rl' }}
        >
          CBAM &amp; ESG
        </div>
      </div>

      <p className="mt-8 text-center text-[12px] uppercase tracking-[0.22em] text-[#A1A1AA] font-semibold">
        Foundation up - each layer carries everything above it - hover any layer to see the service
      </p>
    </div>
  )
}
