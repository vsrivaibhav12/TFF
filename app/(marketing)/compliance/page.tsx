import Link from 'next/link'
import ScrollReveal from '@/components/site/ScrollReveal'
import WhereThisFits from '@/components/site/WhereThisFits'
import MagneticButton from '@/components/site/MagneticButton'
import { ArrowRight, Upload, Activity, Link2, ShieldCheck, Repeat, GitMerge, Lightbulb } from 'lucide-react'

export const metadata = {
  title: 'Compliance as a Service | GST TDS IT Filing | The Fiscal Fulcrum',
  description: 'Structured compliance for manufacturing MSMEs. GST, TDS, Income Tax — processed together, tracked live, always aligned. Starting ₹3,999/month.',
  alternates: { canonical: '/compliance' },
  openGraph: {
    title: 'Compliance as a Service | The Fiscal Fulcrum',
    description: 'GST, TDS, Income Tax — processed together, tracked live, always aligned.',
    url: 'https://www.fiscalfulcrum.in/compliance',
    type: 'website',
  },
}

const benefits = [
  { icon: Upload, label: 'One handoff' },
  { icon: Activity, label: 'Live tracking' },
  { icon: Link2, label: 'Fully aligned' },
  { icon: ShieldCheck, label: 'Nothing missed' },
]

export default function CompliancePage() {
  return (
    <div>
      {/* HERO */}
      <section className="hero-radial py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-semibold">The structured base</p>
            <h1 className="mt-4 font-display text-[32px] sm:text-[44px] lg:text-[52px] font-bold text-[#0F172A] tracking-[-0.03em] leading-[1.05]">
              Compliance <span className="text-[#0D9488]">as a Service</span>
            </h1>
          </ScrollReveal>
        </div>
      </section>

      {/* OPENING + WHAT THIS LOOKS LIKE — merged side-by-side */}
      <section className="bg-white py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7">
              <ScrollReveal>
                <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">How it works</p>
                <h2 className="mt-3 font-display text-[28px] sm:text-[34px] lg:text-[40px] font-bold text-[#0F172A] tracking-[-0.02em] leading-[1.1]">
                  Think of it as a <span className="text-[#0D9488]">compliance concierge.</span>
                </h2>
              </ScrollReveal>
              <ScrollReveal delay={120}>
                <p className="mt-6 text-[#71717A] text-[16px] leading-[1.7]">
                  At the end of the month, you hand over your data once. <span className="text-[#0F172A] font-medium">GST, TDS, Income Tax — all processed together, not separately.</span> Bookkeeping is maintained and reconciled as part of the system. A live dashboard shows pending, in-progress, and completed work across every filing.
                </p>
              </ScrollReveal>
            </div>
            <div className="lg:col-span-5">
              <ScrollReveal delay={150}>
                <div className="grid grid-cols-2 gap-3">
                  {benefits.map((b, i) => {
                    const Icon = b.icon
                    return (
                      <div key={b.label} className="rounded-xl border border-[#E4E4E7] bg-white p-5 flex flex-col items-center text-center hover:border-[#0D9488]/40 hover:shadow-sm transition">
                        <span className="w-10 h-10 rounded-full bg-[#F0FDFA] flex items-center justify-center text-[#0D9488]">
                          <Icon className="w-5 h-5" />
                        </span>
                        <p className="mt-3 text-[13px] font-bold text-[#0F172A]">{b.label}</p>
                      </div>
                    )
                  })}
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* THE DIFFERENCE */}
      <section className="bg-[#F8FAFB] py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="font-display text-[28px] sm:text-[36px] lg:text-[44px] font-semibold text-[#0F172A] tracking-[-0.02em]">
              The <span className="text-[#0D9488]">difference</span>
            </h2>
          </ScrollReveal>
          <div className="mt-10 grid md:grid-cols-3 gap-4">
            {[
              { tag: 'Filing', body: 'Task-based, last-minute, isolated. Any CA can do this.', accent: false },
              { tag: 'Compliance', body: 'Multiple dependencies. Higher risk. Better, but often rushed.', accent: false },
              { tag: 'Structured Compliance', body: 'System-driven. End-to-end tracked. Fully aligned. This is what we do.', accent: true },
            ].map((c, i) => (
              <ScrollReveal key={c.tag} delay={i * 100}>
                <div className={`rounded-xl p-6 h-full transition-all duration-200 ${c.accent ? 'border-2 border-[#0D9488] bg-[#F0FDFA]' : 'border border-[#E4E4E7] bg-white'}`}>
                  <p className={`text-xs uppercase tracking-[0.2em] font-bold ${c.accent ? 'text-[#0D9488]' : 'text-[#A1A1AA]'}`}>{c.tag}</p>
                  <p className="mt-3 text-[#71717A] text-[15px] leading-[1.65]">{c.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* THREE CORE ADVANTAGES */}
      <section className="bg-white py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="font-display text-[28px] sm:text-[36px] lg:text-[44px] font-semibold text-[#0F172A] tracking-[-0.02em]">Three core advantages</h2>
          </ScrollReveal>
          <div className="mt-10 grid md:grid-cols-3 gap-4">
            {[
              { icon: Repeat, t: 'Zero-Friction Handoff', d: 'Data shared once flows across bookkeeping, GST, TDS, and Income Tax seamlessly.' },
              { icon: GitMerge, t: 'Total Ecosystem Harmony', d: 'All filings connected. Bookkeeping feeds GST, GST aligns with TDS, TDS reconciles with IT.' },
              { icon: Lightbulb, t: 'Insights Over Paperwork', d: 'Once the system handles process, we focus on what the numbers actually say.' },
            ].map((a, i) => {
              const Icon = a.icon
              return (
                <ScrollReveal key={a.t} delay={i * 100}>
                  <div className="service-card rounded-xl border border-[#E4E4E7] bg-white p-6 h-full transition-all duration-200">
                    <span className="w-10 h-10 rounded-xl bg-[#F0FDFA] flex items-center justify-center text-[#0D9488]">
                      <Icon className="w-5 h-5" />
                    </span>
                    <h3 className="mt-4 font-display text-[18px] font-semibold text-[#0F172A]">{a.t}</h3>
                    <p className="mt-2 text-[#71717A] text-[15px] leading-[1.6]">{a.d}</p>
                  </div>
                </ScrollReveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* PRICING NUDGE */}
      <section className="bg-[#F8FAFB] py-12 lg:py-16">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="rounded-2xl border-2 border-[#0D9488] bg-white p-6 lg:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">Pricing</p>
              <p className="mt-2 font-display text-[22px] sm:text-[26px] font-bold text-[#0F172A] leading-[1.2]">
                Compliance plans start at <span className="text-[#0D9488]">₹3,999/month</span>.
              </p>
              <p className="mt-2 text-[14px] text-[#71717A] leading-[1.6] max-w-xl">
                Pick a tier on the pricing page and see your monthly commitment instantly. Combine with Virtual CFO or BizLens to view your bundled total.
              </p>
            </div>
            <Link href="/pricing" className="flex-shrink-0 inline-flex items-center gap-2 bg-[#0D9488] text-white font-semibold text-[14px] px-5 py-3 rounded-xl hover:bg-[#0F766E] transition shadow-[0_8px_24px_-8px_rgba(13,148,136,0.5)]">
              See full pricing <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* WHERE THIS FITS */}
      <WhereThisFits current="compliance" />

      {/* CLOSING (with First 30 Days callout) */}
      <section className="bg-white py-12 lg:py-20">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <div className="mx-auto max-w-2xl rounded-xl border-l-4 border-[#0D9488] border border-[#E4E4E7] bg-[#F8FAFB] p-5 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">First 30 days</p>
              <p className="mt-2 text-[15px] text-[#3F3F46] leading-[1.6]">System setup, data alignment, and your first structured filing cycle.</p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={150} className="mt-10 text-center">
            <p className="font-display text-[24px] sm:text-[34px] lg:text-[40px] italic text-[#0D9488] font-bold leading-[1.15]">
              You don’t manage compliance anymore. It runs.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <MagneticButton href="/contact" className="inline-flex items-center gap-2 bg-[#0D9488] text-white font-semibold text-[14px] px-5 py-3 rounded-xl hover:bg-[#0F766E] shadow-[0_8px_24px_-8px_rgba(13,148,136,0.5)]">
                Start with a Conversation <ArrowRight className="w-4 h-4" />
              </MagneticButton>
              <Link href="/contact#snapshot" className="text-[#0D9488] text-sm font-semibold hover:underline">
                Not sure which tier? Get a free assessment →
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}
