import Link from 'next/link'
import ScrollReveal from '@/components/site/ScrollReveal'
import WhereThisFits from '@/components/site/WhereThisFits'
import MagneticButton from '@/components/site/MagneticButton'
import { ArrowRight, Check, X as XIcon, AlertTriangle, ShieldCheck } from 'lucide-react'

export const metadata = {
  title: 'CBAM Advisory for Indian Exporters | EU Carbon Tax Readiness | The Fiscal Fulcrum',
  description: 'CBAM definitive phase is live since January 2026. If you export steel, aluminium, or auto components to the EU, your carbon costs are already being calculated.',
  alternates: { canonical: '/cbam' },
  openGraph: {
    title: 'CBAM & ESG Advisory | The Fiscal Fulcrum',
    description: 'CBAM definitive phase is live since January 2026.',
    url: 'https://www.fiscalfulcrum.in/cbam',
    type: 'website',
  },
}

const timeline = [
  { date: 'Oct 2023 - Dec 2025', title: 'Transitional phase', desc: 'Quarterly reporting, no financial obligation.' },
  { date: 'Jan 1, 2026', title: 'Definitive phase begins', desc: 'Annual reporting. Verified emissions mandatory.' },
  { date: 'Feb 1, 2027', title: 'CBAM certificate sales begin', desc: 'Financial liability starts.' },
  { date: '2026 - 2034', title: 'Phase-in period', desc: 'CBAM obligations increase as EU ETS free allowances phase out.' },
  { date: 'Jan 1, 2035', title: 'Full application', desc: 'Full CBAM with no free allowances.' },
]

export default function CBAMPage() {
  return (
    <div>
      <section className="hero-radial py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-semibold">The cross-cutting overlay</p>
            <h1 className="mt-4 font-display text-[32px] sm:text-[44px] lg:text-[52px] font-bold text-[#0F172A] tracking-[-0.03em] leading-[1.05]">
              CBAM <span className="text-[#0D9488]">&amp; ESG</span>
            </h1>
          </ScrollReveal>
        </div>
      </section>

      <section className="bg-white py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            <ScrollReveal>
              <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">Three questions worth asking</p>
              <h2 className="mt-3 font-display text-[24px] sm:text-[30px] lg:text-[34px] font-bold text-[#0F172A] tracking-[-0.02em] leading-[1.15]">
                Will your business still qualify to supply to the EU in 12 months?
              </h2>
              <div className="mt-6 space-y-2">
                {[
                  'If your buyer asks for your embedded emissions data today, can you provide it?',
                  'If your product is exported to Europe, do you know its carbon cost per tonne?',
                  'If a competitor provides verified low-carbon data and you provide nothing - who gets the next order?',
                ].map((q, i) => (
                  <p key={i} className="text-[15px] sm:text-[16px] text-[#0F172A] leading-snug border-l-2 border-[#E4E4E7] hover:border-[#0D9488] transition pl-5 py-1.5">
                    {q}
                  </p>
                ))}
              </div>
            </ScrollReveal>
            <ScrollReveal delay={150}>
              <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">Where it stands today</p>
              <h2 className="mt-3 font-display text-[24px] sm:text-[30px] lg:text-[34px] font-bold text-[#0F172A] tracking-[-0.02em] leading-[1.15]">
                This is not upcoming regulation. <span className="text-[#0D9488]">It is live.</span>
              </h2>
              <div className="mt-6 grid sm:grid-cols-1 gap-3">
                <div className="rounded-xl bg-white border border-[#E4E4E7] p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#A1A1AA] font-bold">Q1 2026 CBAM certificate price</p>
                  <p className="mt-2 font-display text-[28px] font-bold text-[#0D9488] leading-none tracking-tight">EUR 75.36</p>
                  <p className="mt-1 text-sm text-[#71717A]">per tonne of CO2</p>
                </div>
                <div className="rounded-xl bg-white border border-[#E4E4E7] p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#A1A1AA] font-bold">India default cost (blast furnace steel)</p>
                  <p className="mt-2 font-display text-[28px] font-bold text-[#0D9488] leading-none tracking-tight">EUR 254-270</p>
                  <p className="mt-1 text-sm text-[#71717A]">per tonne</p>
                </div>
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal delay={250}>
            <div className="mt-10 rounded-2xl border-2 border-[#DC2626]/30 bg-gradient-to-r from-[#FEF2F2] via-[#FFF7ED] to-white p-6 lg:p-7 flex items-start gap-4 shadow-[0_10px_30px_-12px_rgba(220,38,38,0.18)]">
              <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#DC2626] text-white flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#DC2626] font-bold">Why this matters now</p>
                <p className="mt-2 font-display text-[20px] sm:text-[24px] font-bold text-[#0F172A] leading-[1.25] tracking-[-0.01em]">
                  No verified data? Default values apply - and your product becomes artificially expensive.
                </p>
                <p className="mt-3 text-[#3F3F46] text-[15px] leading-[1.65]">
                  When you do not provide actual verified emissions data, EU importers fall back on default values benchmarked against the worst-performing producers. Your buyer pays more - and they pass that cost back to you, or move to a competitor who can prove their numbers.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="bg-[#F8FAFB] py-12 lg:py-20">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="font-display text-[28px] sm:text-[36px] lg:text-[44px] font-semibold text-[#0F172A] tracking-[-0.02em]">Who this affects</h2>
          </ScrollReveal>
          <div className="mt-10 grid md:grid-cols-2 gap-4">
            <ScrollReveal>
              <div className="rounded-xl border border-[#E4E4E7] bg-white p-6 h-full">
                <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">CBAM</p>
                <h3 className="mt-2 font-display text-[18px] font-semibold text-[#0F172A]">Exports to EU</h3>
                <p className="mt-3 text-[#71717A] text-[15px] leading-[1.65]">
                  Manufacturers of <span className="text-[#0F172A] font-medium">steel, aluminium, cement, fertilizers, and hydrogen</span>. Businesses exporting products containing these materials - auto components, machinery, fabricated goods, precision engineering parts. If any part of your output reaches the EU supply chain, this applies to you.
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={120}>
              <div className="rounded-xl border border-[#E4E4E7] bg-white p-6 h-full">
                <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">ESG / BRSR</p>
                <h3 className="mt-2 font-display text-[18px] font-semibold text-[#0F172A]">India + Global Supply Chains</h3>
                <p className="mt-3 text-[#71717A] text-[15px] leading-[1.65]">
                  Large listed companies (BRSR mandatory under SEBI). <span className="text-[#0F172A] font-medium">SMEs and MSMEs supplying to them</span> - your customers will push their reporting obligations down to you. Businesses seeking institutional funding or expansion.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="bg-white py-12 lg:py-20">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="font-display text-[28px] sm:text-[36px] lg:text-[44px] font-semibold text-[#0F172A] tracking-[-0.02em]">Two paths from January 2026</h2>
          </ScrollReveal>
          <div className="mt-10 grid md:grid-cols-2 gap-4">
            <ScrollReveal>
              <div className="rounded-2xl border-2 border-[#0D9488] p-6 h-full" style={{ background: '#E8F5F3' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#0D9488] text-white flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h3 className="font-display text-[18px] sm:text-[20px] font-semibold text-[#0F172A]">If You Are Prepared</h3>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {['You retain your EU clients.', 'Your pricing remains competitive.', 'You understand the financial impact in advance.', 'You have access to better financing.', 'Your verified emissions data may be lower than defaults - saving your buyer money.'].map(t => (
                    <li key={t} className="flex gap-2 text-[14px] text-[#3F3F46] leading-[1.55]">
                      <Check className="w-4 h-4 text-[#0D9488] flex-shrink-0 mt-0.5" /> <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={120}>
              <div className="rounded-2xl border-2 p-6 h-full" style={{ background: '#FDE8E8', borderColor: '#DC2626' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#DC2626] text-white flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <h3 className="font-display text-[18px] sm:text-[20px] font-semibold text-[#0F172A]">If You Are Not</h3>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {['Default emission values are applied - your product becomes artificially expensive.', 'Buyers move to compliant competitors.', 'You lose contracts not because of quality, but because of missing data.', 'You face EUR 100/tonne penalty.', 'You are locked out of the fastest-growing market requirement of the decade.'].map(t => (
                    <li key={t} className="flex gap-2 text-[14px] text-[#3F3F46] leading-[1.55]">
                      <XIcon className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-0.5" /> <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="bg-[#F8FAFB] py-12 lg:py-20">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 space-y-6">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">What we do</p>
            <h2 className="mt-3 font-display text-[28px] sm:text-[36px] lg:text-[40px] font-bold text-[#0F172A] tracking-[-0.02em] leading-[1.1]">
              Structured reporting and financial control - <span className="text-[#0D9488]">not sustainability marketing.</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <p className="text-[#71717A] text-[16px] leading-[1.7]">
              We deliver CBAM readiness through a structured engagement combining our financial and compliance expertise with specialized ESG measurement partners <span className="text-[#0F172A] font-medium">accredited under ISO 14065</span>.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={150}>
            <ul className="space-y-3">
              {[
                'Map your product portfolio against CBAM-covered HS codes.',
                'Set up systems to track energy consumption and embedded emissions at product level.',
                'Model the financial impact of carbon costs on your export pricing and margins.',
                'Prepare audit-ready documentation for EU importers and buyers.',
              ].map(t => (
                <li key={t} className="flex gap-3 text-[#71717A] text-[16px] leading-[1.6]">
                  <Check className="w-5 h-5 text-[#0D9488] flex-shrink-0 mt-0.5" /> <span>{t}</span>
                </li>
              ))}
            </ul>
          </ScrollReveal>
          <ScrollReveal delay={250}>
            <div className="rounded-xl border-l-4 border-[#0D9488] border border-[#E4E4E7] bg-white p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">Phase 1 - First 30 days</p>
              <p className="mt-2 text-[15px] text-[#3F3F46] leading-[1.6]">Exposure mapping, product-level HS code analysis, and preliminary emissions estimate.</p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="bg-white py-12 lg:py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="font-display text-[28px] sm:text-[36px] lg:text-[44px] font-semibold text-[#0F172A] tracking-[-0.02em]">Key CBAM timeline</h2>
          </ScrollReveal>
          <div className="mt-10 relative">
            <div className="absolute left-3 top-2 bottom-2 w-px bg-[#E4E4E7]" aria-hidden />
            <div className="space-y-6">
              {timeline.map((t, i) => (
                <ScrollReveal key={i} delay={i * 80}>
                  <div className="relative pl-12">
                    <span className="absolute left-0 top-1.5 w-7 h-7 rounded-full bg-white border-2 border-[#0D9488] flex items-center justify-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488]" />
                    </span>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">{t.date}</p>
                    <h3 className="mt-1 font-display text-[16px] font-semibold text-[#0F172A]">{t.title}</h3>
                    <p className="mt-1 text-[#71717A] text-[15px] leading-[1.6]">{t.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <WhereThisFits current="cbam" />

      <section className="bg-[#F8FAFB] py-12 lg:py-20">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <div className="rounded-2xl border-2 border-[#0D9488] bg-white p-6 lg:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">Pricing</p>
                <p className="mt-2 font-display text-[22px] sm:text-[26px] font-bold text-[#0F172A] leading-[1.2]">
                  CBAM Readiness Audit from <span className="text-[#0D9488]">Rs.3 L</span> to <span className="text-[#0D9488]">Rs.5 L</span>.
                </p>
                <p className="mt-2 text-[14px] text-[#71717A] leading-[1.6] max-w-xl">
                  One-time. Includes product-level emissions mapping, financial impact modelling, and EU buyer documentation. Ongoing reporting can be retained post-audit.
                </p>
              </div>
              <Link href="/pricing" className="flex-shrink-0 inline-flex items-center gap-2 bg-[#0D9488] text-white font-semibold text-[14px] px-5 py-3 rounded-xl hover:bg-[#0F766E] transition shadow-[0_8px_24px_-8px_rgba(13,148,136,0.5)]">
                See full pricing <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={200} className="mt-12 text-center">
            <p className="font-display text-[24px] sm:text-[34px] lg:text-[40px] italic text-[#0D9488] font-bold leading-[1.15]">
              This is not about sustainability messaging. It is about staying relevant in your market.
            </p>
            <div className="mt-8">
              <MagneticButton href="/contact" className="inline-flex items-center gap-2 bg-[#0D9488] text-white font-semibold text-[14px] px-5 py-3 rounded-xl hover:bg-[#0F766E] shadow-[0_8px_24px_-8px_rgba(13,148,136,0.5)]">
                Assess Your CBAM Exposure <ArrowRight className="w-4 h-4" />
              </MagneticButton>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}
