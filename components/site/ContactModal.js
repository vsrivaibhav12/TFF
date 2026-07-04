'use client'
import { useState } from 'react'
import { X, Phone, Mail, Copy, Check } from 'lucide-react'

export function PhoneTrigger({ phone = '+91 88702 08882', className = '', children }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} className={`inline-flex items-center gap-2 hover:text-[#0D9488] transition ${className}`}>
        <Phone className="w-4 h-4" />
        {children || 'Call us'}
      </button>
      {open && <ContactPopup type="phone" value={phone} onClose={() => setOpen(false)} />}
    </>
  )
}

export function MailTrigger({ email = 'info@fiscalfulcrum.in', className = '', children }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} className={`inline-flex items-center gap-2 hover:text-[#0D9488] transition ${className}`}>
        <Mail className="w-4 h-4" />
        {children || 'Email us'}
      </button>
      {open && <ContactPopup type="email" value={email} onClose={() => setOpen(false)} />}
    </>
  )
}

function ContactPopup({ type, value, onClose }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  const action = type === 'phone' ? `tel:${value.replace(/\s/g, '')}` : `mailto:${value}`
  const title = type === 'phone' ? 'Call us' : 'Email us'
  const Icon = type === 'phone' ? Phone : Mail

  return (
    <div
      role="button"
      tabIndex={-1}
      aria-label="Close contact popup"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white rounded-xl border border-[#E4E4E7] w-full max-w-md"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4E7]">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-[#0D9488]" />
            <h3 className="font-semibold text-[#18181B]">{title}</h3>
          </div>
          <button onClick={onClose} className="text-[#71717A] hover:text-[#18181B]"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-6">
          <p className="text-sm text-[#71717A] mb-3">{type === 'phone' ? 'You can reach us at:' : 'Send us an email at:'}</p>
          <div className="flex items-center justify-between gap-3 border border-[#E4E4E7] rounded-lg px-4 py-3">
            <span className="font-medium text-[#18181B] break-all">{value}</span>
            <button onClick={handleCopy} className="text-[#71717A] hover:text-[#0D9488] flex items-center gap-1 text-xs">
              {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
            </button>
          </div>
          <a href={action} className="mt-4 block w-full bg-[#0D9488] text-white text-center font-medium py-2.5 rounded-lg hover:bg-[#0F766E] transition">
            {type === 'phone' ? 'Call Now' : 'Open Email'}
          </a>
        </div>
      </div>
    </div>
  )
}
