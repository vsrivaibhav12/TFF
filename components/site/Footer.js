'use client'
import Link from 'next/link'
import Image from 'next/image'
import { PhoneTrigger, MailTrigger } from './ContactModal'
import { Linkedin, ArrowUp, MapPin, Phone, Mail } from 'lucide-react'

export default function Footer() {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
  return (
    <footer className="relative bg-[#0F172A] text-slate-300 overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#14B8A6] to-transparent" />
      <div className="absolute inset-0 dot-grid-dark opacity-40 pointer-events-none" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full opacity-25 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.55), transparent 65%)' }} />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid md:grid-cols-12 gap-8 lg:gap-10">
          <div className="md:col-span-5">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" width={28} height={28} className="h-7 w-auto" alt="The Fiscal Fulcrum" />
              <span className="font-display text-white font-bold text-[17px]">The Fiscal Fulcrum</span>
            </div>
            <p className="mt-3 text-[14px] text-slate-400 italic">The Manufacturing Finance Partner for Ambitious Businesses</p>
            <p className="mt-5 text-[14px] text-slate-400 leading-relaxed flex items-start gap-3">
              <MapPin className="w-4 h-4 text-[#14B8A6] flex-shrink-0 mt-0.5" />
              <span>373/3, Mettupalayam Road,<br />Near FACT, Vadakovai,<br />Coimbatore - 641043</span>
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a href="https://linkedin.com/in/sri-vaibhav" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn — Sri Vaibhav" className="w-9 h-9 rounded-lg border border-white/15 flex items-center justify-center text-slate-300 hover:text-white hover:border-[#14B8A6] hover:bg-[#0D9488]/20 transition">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="https://linkedin.com/in/mithuna-d-v-61a842178" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn — Mithuna D V" className="w-9 h-9 rounded-lg border border-white/15 flex items-center justify-center text-slate-300 hover:text-white hover:border-[#14B8A6] hover:bg-[#0D9488]/20 transition">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="md:col-span-3">
            <h4 className="text-[11px] uppercase tracking-[0.2em] text-[#14B8A6] font-bold">Services</h4>
            <ul className="mt-4 space-y-2 text-[14px]">
              <li><Link href="/compliance" className="text-slate-300 hover:text-white">Compliance as a Service</Link></li>
              <li><Link href="/virtual-cfo" className="text-slate-300 hover:text-white">Virtual CFO</Link></li>
              <li><Link href="/cbam" className="text-slate-300 hover:text-white">CBAM &amp; ESG</Link></li>
              <li><Link href="/process-controls" className="text-slate-300 hover:text-white">Process &amp; Controls</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-[11px] uppercase tracking-[0.2em] text-[#14B8A6] font-bold">Company</h4>
            <ul className="mt-4 space-y-2 text-[14px]">
              <li><Link href="/pricing" className="text-slate-300 hover:text-white">Pricing</Link></li>
              <li><Link href="/about" className="text-slate-300 hover:text-white">About</Link></li>
              <li><Link href="/insights" className="text-slate-300 hover:text-white">Insights</Link></li>
              <li><Link href="/contact" className="text-slate-300 hover:text-white">Contact</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-[11px] uppercase tracking-[0.2em] text-[#14B8A6] font-bold">Get in touch</h4>
            <div className="mt-4 space-y-3 text-[14px]">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#14B8A6]" />
                <MailTrigger email="info@fiscalfulcrum.in" className="text-slate-300 hover:text-white">Email us</MailTrigger>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#14B8A6]" />
                <PhoneTrigger phone="+91 88702 08882" className="text-slate-300 hover:text-white">Call us</PhoneTrigger>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">© 2026 The Fiscal Fulcrum LLP. All rights reserved.</p>
          <button onClick={scrollToTop} className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition" aria-label="Back to top">
            <ArrowUp className="w-3.5 h-3.5" /> Back to top
          </button>
        </div>
      </div>
    </footer>
  )
}
