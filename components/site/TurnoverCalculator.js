'use client'
import { useState, useEffect, useRef } from 'react'

// Each option carries the typical rupee impact range for an MSME at that turnover.
// Total exposure assumed at ~5–14% of revenue across the four areas below.
const options = [
  { label: '₹1 Cr',    value: 1,   lowLakh: 5,    highLakh: 14    },
  { label: '₹5 Cr',    value: 5,   lowLakh: 25,   highLakh: 70    },
  { label: '₹10 Cr',   value: 10,  lowLakh: 50,   highLakh: 140   },
  { label: '₹25 Cr',   value: 25,  lowLakh: 125,  highLakh: 350   },
  { label: '₹50 Cr',   value: 50,  lowLakh: 250,  highLakh: 700   },
  { label: '₹100 Cr+', value: 100, lowLakh: 500,  highLakh: 1400  },
]

// Format lakh into "₹XX L" or "₹X.XX Cr" automatically.
function formatLakh(l) {
  if (l >= 100) {
    const cr = l / 100
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr`
  }
  return `₹${l} L`
}

// The four common places money leaks. Plain language for non-finance owners.
const buckets = [
  { label: 'Money locked in receivables', share: 0.40, hint: 'Customers paying late. Cash you earned but cannot use.' },
  { label: 'Margin you never realised',   share: 0.30, hint: 'Wrong pricing or hidden costs eating profit quietly.' },
  { label: 'Filings done late or wrong',  share: 0.15, hint: 'GST, TDS, IT — penalties and missed input credits.' },
  { label: 'Decisions made in the dark',  share: 0.15, hint: 'Buying, hiring, expanding without clean numbers.' },
]

export default function TurnoverCalculator() {
  const [idx, setIdx] = useState(2) // default ₹10 Cr
  const [interacted, setInteracted] = useState(false)
  const [showResult, setShowResult] = useState(false)

  const sliderRef = useRef(null)
  const trackPercent = (idx / (options.length - 1)) * 100
  const opt = options[idx]

  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.style.setProperty('--p', `${trackPercent}%`)
    }
  }, [trackPercent])

  useEffect(() => {
    const t = setTimeout(() => setShowResult(true), 250)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="w-full max-w-2xl">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[15px] font-medium text-[#3F3F46]">Your annual turnover</p>
        <p className="text-[13px] text-[#A1A1AA]">Drag to see the impact</p>
      </div>

      <div className="relative mt-8 px-2">
        {/* Floating tooltip */}
        <div
          className="absolute -top-12 transition-all duration-200 ease-out pointer-events-none"
          style={{ left: `calc(${trackPercent}% + 8px)`, transform: 'translateX(-50%)' }}
        >
          <div className="relative">
            <div className="bg-[#0D9488] text-white text-[13px] font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-md">
              {opt.label}
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-[#0D9488] rotate-45" />
          </div>
        </div>

        <input
          ref={sliderRef}
          type="range"
          min={0}
          max={options.length - 1}
          step={1}
          value={idx}
          onChange={(e) => { setIdx(Number(e.target.value)); setInteracted(true) }}
          onInput={() => setInteracted(true)}
          className={`tf-slider ${!interacted ? 'is-idle' : ''}`}
          aria-label="Annual turnover selector"
        />

        {/* Tick labels */}
        <div className="mt-4 flex justify-between text-[12px] text-[#A1A1AA] px-1">
          {options.map((o, i) => (
            <button
              key={o.label}
              onClick={() => { setIdx(i); setInteracted(true) }}
              className={`transition ${i === idx ? 'text-[#0D9488] font-semibold' : 'hover:text-[#3F3F46]'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {showResult && (
        <div key={idx} className="mt-12">
          <p className="text-[12px] uppercase tracking-[0.18em] text-[#A1A1AA] font-bold">
            For a business at {opt.label} turnover —
          </p>
          <p className="mt-2 font-display text-[24px] sm:text-[30px] font-bold text-[#18181B] leading-[1.2] tracking-tight animate-fade-up">
            <span className="text-[#0D9488]">{formatLakh(opt.lowLakh)} – {formatLakh(opt.highLakh)}</span> is typically slipping through every year.
          </p>
          <p className="mt-3 text-[14px] sm:text-[15px] text-[#71717A] leading-[1.6]">
            That&apos;s <span className="text-[#0D9488] font-semibold">5–14% of your revenue</span> — money you&apos;ve earned but never see, because it gets stuck in four places:
          </p>

          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            {buckets.map((b, k) => {
              const lakhLow = Math.round(opt.lowLakh * b.share)
              const lakhHigh = Math.round(opt.highLakh * b.share)
              return (
                <div
                  key={b.label}
                  className="indicator-card rounded-xl p-4 opacity-0 animate-fade-up"
                  style={{ animationDelay: `${k * 90}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[14px] font-semibold text-[#18181B] leading-snug">{b.label}</p>
                    <span className="text-[14px] text-[#0D9488] font-bold tracking-tight whitespace-nowrap">
                      {formatLakh(lakhLow)}–{formatLakh(lakhHigh)}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#71717A] mt-1.5 leading-relaxed">{b.hint}</p>
                </div>
              )
            })}
          </div>
          <p className="mt-5 text-xs text-[#A1A1AA] leading-relaxed max-w-xl">
            Indicative ranges based on industry benchmarks for Indian manufacturing MSMEs. Your actual exposure depends on your finance setup today.
          </p>
        </div>
      )}
    </div>
  )
}
