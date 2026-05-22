'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, Sparkles, Phone, ArrowRight, Plus } from 'lucide-react'

/**
 * PricingBuilder — interactive picker that lets a visitor compose a plan
 * across services and instantly see their monthly + one-time + per-day cost.
 *
 * Persuasion mechanics used (tastefully):
 *   1. Default-on the most-recommended starting plan (Compliance Growth).
 *   2. Per-day equivalent rendered prominently — "less than ₹X/day" framing.
 *   3. "Talk to sales" custom tier always visible, never hidden behind pricing.
 *   4. Live total animated as user toggles options.
 */

// ── Catalog ──────────────────────────────────────────────────────────────────

const compliance = {
  key: 'compliance',
  category: 'Recurring',
  title: 'Compliance as a Service',
  blurb: 'GST + TDS + Income Tax handled together, with bookkeeping and a live tracker.',
  tiers: [
    { id: 'starter',    label: 'Starter',    price: 3999,  desc: 'Up to 50 transactions/month. Sole props, small partnerships.' },
    { id: 'growth',     label: 'Growth',     price: 9499,  desc: '50–200 transactions/month. Multi-tax-head needs.', recommended: true },
    { id: 'enterprise', label: 'Enterprise', price: 14999, desc: '200+ transactions/month. Multi-state, multi-entity.' },
  ],
}

const vcfo = {
  key: 'vcfo',
  category: 'Recurring',
  title: 'Virtual CFO Retainer',
  blurb: 'A CA who reviews BizLens analytics with you every month and works on the gaps.',
  // Single line item with a slider for level
  range: { min: 25000, max: 75000, step: 5000, defaultValue: 35000 },
  rangeNote: 'Final fee depends on number of entities, complexity, and meeting cadence.',
}

const bizlens = {
  key: 'bizlens',
  category: 'Recurring',
  title: 'BizLens Standalone',
  blurb: 'Monthly analytics refresh. Portal access. No advisory calls — pure data.',
  price: 4999,
  note: 'Already included if you pick Virtual CFO.',
}

const oneTimes = [
  {
    key: 'controls',
    category: 'One-time',
    title: 'Process & Controls',
    blurb: 'SOX/ICFR-grade design, testing, and remediation. Scope-dependent project.',
    range: { min: 200000, max: 1000000, step: 50000, defaultValue: 350000 },
    rangeNote: '₹2L for a single-process review · ₹10L+ for full ICFR build-out.',
  },
  {
    key: 'cbam',
    category: 'One-time',
    title: 'CBAM Readiness Audit',
    blurb: 'EU export readiness — emissions mapping, financial impact, audit-ready docs.',
    range: { min: 300000, max: 500000, step: 25000, defaultValue: 400000 },
    rangeNote: 'Engagement fee. Ongoing reporting can be retained separately.',
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(n) {
  if (n == null || n === 0) return '₹0'
  // Indian numbering — group lakhs/crores
  return '₹' + n.toLocaleString('en-IN')
}

function compactINR(n) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(n % 10000000 === 0 ? 0 : 2)} Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 2)} L`
  if (n >= 1000)     return `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`
  return `₹${n}`
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PricingBuilder() {
  const [complianceTier, setComplianceTier] = useState('growth') // 'none' | tier id
  const [vcfoOn, setVcfoOn]                 = useState(false)
  const [vcfoFee, setVcfoFee]               = useState(vcfo.range.defaultValue)
  const [bizlensOn, setBizlensOn]           = useState(false)
  const [controlsOn, setControlsOn]         = useState(false)
  const [controlsFee, setControlsFee]       = useState(oneTimes[0].range.defaultValue)
  const [cbamOn, setCbamOn]                 = useState(false)
  const [cbamFee, setCbamFee]               = useState(oneTimes[1].range.defaultValue)

  // BizLens is bundled inside vCFO — auto-disable + warn if both are picked
  const effectiveBizlens = vcfoOn ? false : bizlensOn

  const monthly = useMemo(() => {
    let m = 0
    const tier = compliance.tiers.find(t => t.id === complianceTier)
    if (tier) m += tier.price
    if (vcfoOn) m += vcfoFee
    if (effectiveBizlens) m += bizlens.price
    return m
  }, [complianceTier, vcfoOn, vcfoFee, effectiveBizlens])

  const oneTime = useMemo(() => {
    let o = 0
    if (controlsOn) o += controlsFee
    if (cbamOn) o += cbamFee
    return o
  }, [controlsOn, controlsFee, cbamOn, cbamFee])

  // Per-day equivalent (calendar days, more persuasive than working days)
  const perDay = Math.round(monthly / 30)

  const queryStr = useMemo(() => {
    const parts = []
    if (complianceTier !== 'none') parts.push(`compliance=${complianceTier}`)
    if (vcfoOn) parts.push(`vcfo=${vcfoFee}`)
    if (effectiveBizlens) parts.push('bizlens=1')
    if (controlsOn) parts.push(`controls=${controlsFee}`)
    if (cbamOn) parts.push(`cbam=${cbamFee}`)
    parts.push(`monthly=${monthly}`)
    parts.push(`onetime=${oneTime}`)
    return parts.join('&')
  }, [complianceTier, vcfoOn, vcfoFee, effectiveBizlens, controlsOn, controlsFee, cbamOn, cbamFee, monthly, oneTime])

  return (
    <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
      {/* Left — picker */}
      <div className="lg:col-span-8 space-y-6">
        {/* Compliance */}
        <ServiceBlock category="Recurring · Layer 01" title={compliance.title} blurb={compliance.blurb}>
          <div className="grid sm:grid-cols-3 gap-3 mt-4">
            <TierCard
              active={complianceTier === 'none'}
              onClick={() => setComplianceTier('none')}
              label="No compliance"
              priceLabel="Skip"
              desc="Not for me right now."
            />
            {compliance.tiers.map(t => (
              <TierCard
                key={t.id}
                active={complianceTier === t.id}
                onClick={() => setComplianceTier(t.id)}
                label={t.label}
                priceLabel={`${formatINR(t.price)}/mo`}
                desc={t.desc}
                recommended={t.recommended}
              />
            ))}
          </div>
        </ServiceBlock>

        {/* Virtual CFO */}
        <ServiceBlock category="Recurring · Layer 03" title={vcfo.title} blurb={vcfo.blurb}>
          <div className="mt-4 flex items-center justify-between">
            <Toggle on={vcfoOn} onChange={setVcfoOn} label="Add Virtual CFO" />
            {vcfoOn && (
              <span className="text-[14px] text-[#0D9488] font-bold">
                {formatINR(vcfoFee)}/mo
              </span>
            )}
          </div>
          {vcfoOn && (
            <div className="mt-4 space-y-2">
              <input
                type="range"
                min={vcfo.range.min}
                max={vcfo.range.max}
                step={vcfo.range.step}
                value={vcfoFee}
                onChange={e => setVcfoFee(Number(e.target.value))}
                className="tf-slider"
                style={{ '--p': `${((vcfoFee - vcfo.range.min) / (vcfo.range.max - vcfo.range.min)) * 100}%` }}
                aria-label="Virtual CFO fee"
              />
              <div className="flex justify-between text-[11px] text-[#A1A1AA]">
                <span>{compactINR(vcfo.range.min)}/mo</span>
                <span>{compactINR(vcfo.range.max)}/mo</span>
              </div>
              <p className="text-[12px] text-[#71717A] leading-[1.5]">{vcfo.rangeNote}</p>
            </div>
          )}
        </ServiceBlock>

        {/* BizLens standalone */}
        <ServiceBlock category="Recurring · Layer 02" title={bizlens.title} blurb={bizlens.blurb}>
          <div className="mt-4 flex items-center justify-between">
            <Toggle
              on={effectiveBizlens}
              disabled={vcfoOn}
              onChange={setBizlensOn}
              label={vcfoOn ? 'Already included with Virtual CFO' : 'Add BizLens analytics'}
            />
            {!vcfoOn && bizlensOn && (
              <span className="text-[14px] text-[#0D9488] font-bold">{formatINR(bizlens.price)}/mo</span>
            )}
          </div>
          <p className="mt-2 text-[12px] text-[#71717A]">{bizlens.note}</p>
        </ServiceBlock>

        {/* One-time engagements */}
        <div className="rounded-2xl border border-dashed border-[#0D9488]/40 bg-[#F0FDFA]/40 p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">One-time engagements</p>
          <p className="mt-1 text-[14px] text-[#71717A]">Project-based work — quoted before any engagement begins.</p>

          <div className="mt-5 space-y-5">
            {/* Process & Controls */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[15px] font-semibold text-[#0F172A]">Process &amp; Controls (Layer 04)</p>
                  <p className="text-[13px] text-[#71717A] mt-0.5">{oneTimes[0].blurb}</p>
                </div>
                <Toggle on={controlsOn} onChange={setControlsOn} label="" small />
              </div>
              {controlsOn && (
                <div className="mt-3">
                  <input
                    type="range"
                    min={oneTimes[0].range.min}
                    max={oneTimes[0].range.max}
                    step={oneTimes[0].range.step}
                    value={controlsFee}
                    onChange={e => setControlsFee(Number(e.target.value))}
                    className="tf-slider"
                    style={{ '--p': `${((controlsFee - oneTimes[0].range.min) / (oneTimes[0].range.max - oneTimes[0].range.min)) * 100}%` }}
                    aria-label="Process and Controls scope"
                  />
                  <div className="flex justify-between text-[11px] text-[#A1A1AA] mt-1">
                    <span>{compactINR(oneTimes[0].range.min)}</span>
                    <span className="text-[#0D9488] font-bold text-[13px]">{compactINR(controlsFee)}</span>
                    <span>{compactINR(oneTimes[0].range.max)}+</span>
                  </div>
                  <p className="mt-1 text-[12px] text-[#71717A]">{oneTimes[0].rangeNote}</p>
                </div>
              )}
            </div>

            {/* CBAM */}
            <div className="pt-5 border-t border-[#0D9488]/15">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[15px] font-semibold text-[#0F172A]">CBAM Readiness Audit</p>
                  <p className="text-[13px] text-[#71717A] mt-0.5">{oneTimes[1].blurb}</p>
                </div>
                <Toggle on={cbamOn} onChange={setCbamOn} label="" small />
              </div>
              {cbamOn && (
                <div className="mt-3">
                  <input
                    type="range"
                    min={oneTimes[1].range.min}
                    max={oneTimes[1].range.max}
                    step={oneTimes[1].range.step}
                    value={cbamFee}
                    onChange={e => setCbamFee(Number(e.target.value))}
                    className="tf-slider"
                    style={{ '--p': `${((cbamFee - oneTimes[1].range.min) / (oneTimes[1].range.max - oneTimes[1].range.min)) * 100}%` }}
                    aria-label="CBAM readiness scope"
                  />
                  <div className="flex justify-between text-[11px] text-[#A1A1AA] mt-1">
                    <span>{compactINR(oneTimes[1].range.min)}</span>
                    <span className="text-[#0D9488] font-bold text-[13px]">{compactINR(cbamFee)}</span>
                    <span>{compactINR(oneTimes[1].range.max)}</span>
                  </div>
                  <p className="mt-1 text-[12px] text-[#71717A]">{oneTimes[1].rangeNote}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right — sticky summary */}
      <div className="lg:col-span-4">
        <div className="lg:sticky lg:top-24 rounded-2xl border-2 border-[#0D9488] bg-white p-6 shadow-[0_18px_40px_-20px_rgba(13,148,136,0.55)]">
          <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">Your plan</p>

          {monthly === 0 && oneTime === 0 ? (
            <p className="mt-4 text-[14px] text-[#71717A] leading-[1.65]">
              Start by picking the layers you need on the left. Pricing updates live.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {monthly > 0 && (
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-[36px] sm:text-[40px] font-bold text-[#0F172A] tracking-tight leading-none">
                      {formatINR(monthly)}
                    </span>
                    <span className="text-[14px] text-[#71717A]">/month</span>
                  </div>
                  <p className="mt-1 text-[13px] text-[#0D9488] font-semibold">
                    Less than {formatINR(perDay)} a day
                  </p>
                </div>
              )}
              {oneTime > 0 && (
                <div className="pt-3 border-t border-[#E4E4E7]">
                  <p className="text-[12px] uppercase tracking-[0.18em] text-[#A1A1AA] font-bold">One-time</p>
                  <p className="mt-1 text-[20px] font-bold text-[#0F172A]">{formatINR(oneTime)}</p>
                </div>
              )}
              {/* Plan summary */}
              <ul className="pt-3 border-t border-[#E4E4E7] space-y-1.5">
                {complianceTier !== 'none' && (
                  <Line label={`Compliance — ${compliance.tiers.find(t => t.id === complianceTier)?.label}`} value={`${formatINR(compliance.tiers.find(t => t.id === complianceTier)?.price)}/mo`} />
                )}
                {vcfoOn && <Line label="Virtual CFO" value={`${formatINR(vcfoFee)}/mo`} />}
                {effectiveBizlens && <Line label="BizLens Standalone" value={`${formatINR(bizlens.price)}/mo`} />}
                {controlsOn && <Line label="Process & Controls" value={`${compactINR(controlsFee)} one-time`} />}
                {cbamOn && <Line label="CBAM Readiness" value={`${compactINR(cbamFee)} one-time`} />}
              </ul>
            </div>
          )}

          <Link
            href={`/contact?${queryStr}`}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-[#0D9488] text-white font-semibold text-[14px] px-5 py-3 rounded-xl hover:bg-[#0F766E] transition shadow-[0_8px_24px_-8px_rgba(13,148,136,0.5)]"
          >
            Talk to us about this plan <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="mt-3 text-[12px] text-[#71717A] text-center leading-[1.5]">
            We confirm your final fee in a 15-minute call. No commitment until you say yes.
          </p>
        </div>

        {/* Custom tier */}
        <div className="mt-5 rounded-2xl border border-[#E4E4E7] bg-[#F8FAFB] p-5">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#0F172A] text-white flex items-center justify-center">
              <Phone className="w-4 h-4" />
            </span>
            <div>
              <p className="text-[15px] font-semibold text-[#0F172A]">Need something custom?</p>
              <p className="mt-1 text-[13px] text-[#71717A] leading-[1.6]">
                Multi-entity. Group consolidations. IPO-readiness. Promoter-led restructuring. We price these case-by-case.
              </p>
              <Link href="/contact" className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-[#0D9488] hover:underline">
                Talk to sales <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ServiceBlock({ category, title, blurb, children }) {
  return (
    <div className="rounded-2xl border border-[#E4E4E7] bg-white p-5 sm:p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">{category}</p>
      <h3 className="mt-1 font-display text-[18px] sm:text-[20px] font-semibold text-[#0F172A]">{title}</h3>
      <p className="mt-1 text-[14px] text-[#71717A] leading-[1.6]">{blurb}</p>
      {children}
    </div>
  )
}

function TierCard({ active, onClick, label, priceLabel, desc, recommended }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative text-left rounded-xl border p-3 transition-all duration-150 ${active ? 'border-[#0D9488] bg-[#F0FDFA] shadow-[0_4px_12px_-6px_rgba(13,148,136,0.4)]' : 'border-[#E4E4E7] bg-white hover:border-[#0D9488]/40 hover:bg-[#F8FAFB]'}`}
    >
      {recommended && (
        <span className="absolute -top-2 right-3 inline-flex items-center gap-1 bg-[#0D9488] text-white text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full">
          <Sparkles className="w-2.5 h-2.5" /> Recommended
        </span>
      )}
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-bold text-[#0F172A]">{label}</span>
        <span className={`text-[12px] font-bold ${active ? 'text-[#0D9488]' : 'text-[#71717A]'}`}>{priceLabel}</span>
      </div>
      <p className="mt-1 text-[12px] text-[#71717A] leading-[1.45]">{desc}</p>
      {active && (
        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#0D9488] text-white flex items-center justify-center">
          <Check className="w-2.5 h-2.5" />
        </span>
      )}
    </button>
  )
}

function Toggle({ on, onChange, label, disabled = false, small = false }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!on)}
      role="switch"
      aria-checked={on}
      disabled={disabled}
      className={`inline-flex items-center gap-3 ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`relative inline-flex h-${small ? '5' : '6'} w-${small ? '9' : '11'} flex-shrink-0 rounded-full transition-colors ${on ? 'bg-[#0D9488]' : 'bg-[#E4E4E7]'}`}
        style={{ height: small ? 22 : 26, width: small ? 38 : 46 }}
      >
        <span
          className="inline-block rounded-full bg-white shadow transition-transform"
          style={{
            height: small ? 18 : 22,
            width: small ? 18 : 22,
            transform: on ? `translateX(${small ? 18 : 22}px) translateY(2px)` : 'translateX(2px) translateY(2px)',
          }}
        />
      </span>
      {label && <span className={`text-[14px] font-medium ${on ? 'text-[#0F172A]' : 'text-[#3F3F46]'}`}>{label}</span>}
    </button>
  )
}

function Line({ label, value }) {
  return (
    <li className="flex items-baseline justify-between gap-2 text-[13px]">
      <span className="text-[#3F3F46] flex items-center gap-1.5"><Check className="w-3 h-3 text-[#0D9488] flex-shrink-0" /> {label}</span>
      <span className="text-[#71717A] font-medium whitespace-nowrap">{value}</span>
    </li>
  )
}
