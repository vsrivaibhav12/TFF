'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, ArrowRight, Loader2, FileText } from 'lucide-react'

const FORMSPREE = 'https://formspree.io/f/xpqbanlv'

const services = [
  'Compliance',
  'Virtual CFO',
  'CBAM Advisory',
  'Process & Controls',
  'Not sure yet',
]

const complianceTierLabels = {
  starter: 'Starter (Rs.3,999/mo)',
  growth: 'Growth (Rs.9,499/mo)',
  enterprise: 'Enterprise (Rs.14,999/mo)',
}

function formatINR(n) {
  if (n == null || n === 0) return 'Rs.0'
  return 'Rs.' + Number(n).toLocaleString('en-IN')
}

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [interests, setInterests] = useState([])
  const [planSummary, setPlanSummary] = useState(null)

  const params = useSearchParams()

  useEffect(() => {
    if (!params) return
    const compliance = params.get('compliance')
    const vcfo       = params.get('vcfo')
    const bizlens    = params.get('bizlens')
    const controls   = params.get('controls')
    const cbam       = params.get('cbam')
    const monthly    = params.get('monthly')
    const oneTime    = params.get('onetime')

    if (!compliance && !vcfo && !bizlens && !controls && !cbam) return

    const lines = []
    const auto  = new Set()
    if (compliance && compliance !== 'none') {
      lines.push('Compliance - ' + (complianceTierLabels[compliance] || compliance))
      auto.add('Compliance')
    }
    if (vcfo) {
      lines.push('Virtual CFO - ' + formatINR(vcfo) + '/mo')
      auto.add('Virtual CFO')
    }
    if (bizlens) {
      lines.push('BizLens Standalone - Rs.4,999/mo')
      auto.add('Virtual CFO')
    }
    if (controls) {
      lines.push('Process & Controls - one-time ' + formatINR(controls))
      auto.add('Process & Controls')
    }
    if (cbam) {
      lines.push('CBAM Readiness - one-time ' + formatINR(cbam))
      auto.add('CBAM Advisory')
    }
    setInterests(Array.from(auto))
    setPlanSummary({ lines, monthly: Number(monthly) || 0, oneTime: Number(oneTime) || 0 })
  }, [params])

  const toggleInterest = (i) => {
    setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    fd.append('looking_for', interests.join(', '))
    fd.append('_subject', planSummary ? 'New conversation request (with plan) - Fiscal Fulcrum' : 'New conversation request - Fiscal Fulcrum')
    if (planSummary) {
      fd.append('plan_lines', planSummary.lines.join(' | '))
      if (planSummary.monthly) fd.append('plan_monthly', String(planSummary.monthly))
      if (planSummary.oneTime) fd.append('plan_one_time', String(planSummary.oneTime))
    }
    try {
      const res = await fetch(FORMSPREE, { method: 'POST', body: fd, headers: { Accept: 'application/json' } })
      if (res.ok) setSubmitted(true)
      else setError('Something went wrong. Please try again or email us directly.')
    } catch (err) {
      setError('Network error. Please try again or email us directly.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-[#0D9488] bg-[#F0FDFA] p-7 flex items-start gap-3">
        <Check className="w-6 h-6 text-[#0D9488] mt-0.5" />
        <div>
          <p className="text-[18px] font-semibold text-[#18181B]">Thank you. We have received your message.</p>
          <p className="mt-1 text-[15px] text-[#71717A]">We will get back to you within one working day.</p>
        </div>
      </div>
    )
  }

  const input = 'w-full border border-[#E4E4E7] rounded-lg px-4 py-3 text-[15px] text-[#18181B] placeholder-[#A1A1AA] focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 transition'
  const label = 'text-[13px] font-medium text-[#18181B]'

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {planSummary && (
        <div className="rounded-xl border border-[#0D9488] bg-gradient-to-br from-[#F0FDFA] to-white p-4 sm:p-5 flex items-start gap-3">
          <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#0D9488] text-white flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">Plan from pricing builder</p>
            <ul className="mt-2 space-y-1 text-[14px] text-[#0F172A]">
              {planSummary.lines.map((l, i) => (
                <li key={i} className="flex gap-2"><span className="text-[#0D9488]">{'•'}</span><span>{l}</span></li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              {planSummary.monthly > 0 && (
                <p className="text-[14px]"><span className="font-bold text-[#0F172A]">{formatINR(planSummary.monthly)}</span><span className="text-[#71717A]">/month</span></p>
              )}
              {planSummary.oneTime > 0 && (
                <p className="text-[14px]"><span className="font-bold text-[#0F172A]">{formatINR(planSummary.oneTime)}</span><span className="text-[#71717A]"> one-time</span></p>
              )}
            </div>
            <p className="mt-2 text-[12px] text-[#71717A]">We confirm the final fee on a 15-minute call. Edit your plan anytime - pricing is indicative.</p>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label htmlFor="cf-name" className={label}>Name <span className="text-[#0D9488]" aria-hidden>*</span><span className="sr-only"> required</span></label>
          <input id="cf-name" name="name" required autoComplete="name" className={input} placeholder="Full name" />
        </div>
        <div className="space-y-2">
          <label htmlFor="cf-business" className={label}>Business name <span className="text-[#0D9488]" aria-hidden>*</span><span className="sr-only"> required</span></label>
          <input id="cf-business" name="business" required autoComplete="organization" className={input} placeholder="Company name" />
        </div>
        <div className="space-y-2">
          <label htmlFor="cf-phone" className={label}>Phone <span className="text-[#0D9488]" aria-hidden>*</span><span className="sr-only"> required</span></label>
          <input id="cf-phone" name="phone" type="tel" required autoComplete="tel" className={input} placeholder="+91 ..." />
        </div>
        <div className="space-y-2">
          <label htmlFor="cf-email" className={label}>Email <span className="text-[#0D9488]" aria-hidden>*</span><span className="sr-only"> required</span></label>
          <input id="cf-email" name="email" type="email" required autoComplete="email" className={input} placeholder="you@company.com" />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="cf-turnover" className={label}>Turnover range</label>
        <select id="cf-turnover" name="turnover" className={input}>
          <option value="">Select range</option>
          <option>Under Rs.1 Cr</option>
          <option>Rs.1-5 Cr</option>
          <option>Rs.5-25 Cr</option>
          <option>Rs.25-100 Cr</option>
          <option>Rs.100 Cr+</option>
        </select>
      </div>

      <fieldset className="space-y-3">
        <legend className={label}>What are you looking for?</legend>
        <div className="flex flex-wrap gap-2">
          {services.map(s => {
            const active = interests.includes(s)
            return (
              <button
                type="button"
                key={s}
                aria-pressed={active}
                onClick={() => toggleInterest(s)}
                className={'px-4 py-2 rounded-full text-sm font-medium border transition focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40 focus:ring-offset-1 ' + (active ? 'bg-[#0D9488] text-white border-[#0D9488]' : 'border-[#E4E4E7] text-[#3F3F46] hover:border-[#0D9488] hover:text-[#0D9488]')}
              >
                {s}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="space-y-2">
        <label htmlFor="cf-message" className={label}>Anything you would like us to know?</label>
        <textarea id="cf-message" name="message" rows={4} className={input} placeholder="Optional. A few lines on your business and what you are trying to solve." />
      </div>

      {error && <p role="alert" aria-live="polite" className="text-sm text-[#DC2626]">{error}</p>}

      <button disabled={loading} type="submit" className="inline-flex items-center gap-2 bg-[#0D9488] text-white font-medium px-6 py-3 rounded-lg hover:bg-[#0F766E] transition shadow-sm hover:shadow-md disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40 focus:ring-offset-2">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <>Start a Conversation <ArrowRight className="w-4 h-4" /></>}
      </button>
    </form>
  )
}
