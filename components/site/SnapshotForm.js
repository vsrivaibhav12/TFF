'use client'
import { useState } from 'react'
import { Check, ArrowRight, Loader2, Upload } from 'lucide-react'

const FORMSPREE = 'https://formspree.io/f/xpqbanlv'

export default function SnapshotForm() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    fd.append('_subject', 'Free Financial Snapshot request — Fiscal Fulcrum')
    fd.append('_form', 'Snapshot')
    try {
      const res = await fetch(FORMSPREE, { method: 'POST', body: fd, headers: { Accept: 'application/json' } })
      if (res.ok) {
        setSubmitted(true)
      } else {
        setError('Something went wrong. Please try again or email us directly.')
      }
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
          <p className="text-[18px] font-semibold text-[#18181B]">Thank you. We have received your details.</p>
          <p className="mt-1 text-[15px] text-[#71717A]">We’ll respond within one working day with your Financial Snapshot.</p>
        </div>
      </div>
    )
  }

  const input = 'w-full border border-[#E4E4E7] rounded-lg px-4 py-3 text-[15px] text-[#18181B] placeholder-[#A1A1AA] focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 transition'
  const label = 'text-[13px] font-medium text-[#18181B]'

  return (
    <form onSubmit={handleSubmit} className="space-y-5" encType="multipart/form-data" noValidate>
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label htmlFor="sf-name" className={label}>Name <span className="text-[#0D9488]" aria-hidden>*</span><span className="sr-only"> required</span></label>
          <input id="sf-name" name="name" required autoComplete="name" className={input} placeholder="Full name" />
        </div>
        <div className="space-y-2">
          <label htmlFor="sf-business" className={label}>Business name <span className="text-[#0D9488]" aria-hidden>*</span><span className="sr-only"> required</span></label>
          <input id="sf-business" name="business" required autoComplete="organization" className={input} placeholder="Company name" />
        </div>
        <div className="space-y-2">
          <label htmlFor="sf-email" className={label}>Email <span className="text-[#0D9488]" aria-hidden>*</span><span className="sr-only"> required</span></label>
          <input id="sf-email" name="email" type="email" required autoComplete="email" className={input} placeholder="you@company.com" />
        </div>
        <div className="space-y-2">
          <label htmlFor="sf-phone" className={label}>Phone <span className="text-[#0D9488]" aria-hidden>*</span><span className="sr-only"> required</span></label>
          <input id="sf-phone" name="phone" type="tel" required autoComplete="tel" className={input} placeholder="+91 …" />
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="sf-tb" className={label}>Upload Trial Balance / FS data</label>
        <label htmlFor="sf-tb" className="flex items-center justify-between gap-3 border border-dashed border-[#E4E4E7] rounded-lg px-4 py-4 cursor-pointer hover:border-[#0D9488] hover:bg-[#F0FDFA] transition">
          <div className="flex items-center gap-3 min-w-0">
            <Upload className="w-5 h-5 text-[#0D9488] flex-shrink-0" />
            <span className="text-[15px] text-[#71717A] truncate">{fileName || 'Drop a file or click to upload (PDF, Excel, CSV)'}</span>
          </div>
          <span className="text-[13px] text-[#0D9488] font-semibold whitespace-nowrap">Browse</span>
          <input
            id="sf-tb"
            type="file"
            name="trial_balance"
            accept=".pdf,.xls,.xlsx,.csv"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
          />
        </label>
      </div>
      {error && <p role="alert" aria-live="polite" className="text-sm text-[#DC2626]">{error}</p>}
      <button disabled={loading} type="submit" className="inline-flex items-center gap-2 bg-[#0D9488] text-white font-medium px-6 py-3 rounded-lg hover:bg-[#0F766E] transition shadow-sm hover:shadow-md disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40 focus:ring-offset-2">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <>Get My Snapshot <ArrowRight className="w-4 h-4" /></>}
      </button>
    </form>
  )
}
