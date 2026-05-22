import Link from 'next/link'
import TurnoverCalculator from '@/components/site/TurnoverCalculator'
import { ScatteredDashboard, UnifiedDashboard } from '@/components/site/SystemDiagram'
import LayeredServices from '@/components/site/LayeredServices'
import AnimatedCounter from '@/components/site/AnimatedCounter'
import ScrollReveal from '@/components/site/ScrollReveal'
import WordReveal from '@/components/site/WordReveal'
import MagneticButton from '@/components/site/MagneticButton'
import Testimonials from '@/components/site/Testimonials'
import { ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'The Fiscal Fulcrum | Finance Partner | Coimbatore',
  description: 'Structured compliance, financial intelligence, and strategic advisory for Coimbatore\u2019s manufacturing MSMEs. CaaS, Virtual CFO, BizLens, CBAM.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'The Fiscal Fulcrum | Finance Partner | Coimbatore',
    description: 'Structured compliance, financial intelligence, and strategic advisory for Coimbatore\u2019s manufacturing MSMEs.',
    url: 'https://www.fiscalfulcrum.in/',
    type: 'website',
  },
}

export default function Home() {
  return (
    <div>
      {/* === SECTION 1 — HERO === */}
      <section className="relative overflow-hidden hero-mesh grain min-h-[calc(85vh-4rem)] flex items-center">
        <div className="absolute inset-0 dot-grid-faint opacity-40 pointer-events-none" aria-hidden />

        <div className="relative w-full mx-auto px-6 lg:px-8 py-12 lg:py-20">
          <div className="max-w-4xl mx-auto text-center">
            <WordReveal as="h1" className="font-display text-[36px] sm:text-[52px] lg:text-[64px] font-bold tracking-[-0.03em] text-[#0F172A] leading-[1.05]" stagger={45}>
              {'Are your decisions based on '}
              <span className="relative inline-block text-[#0D9488]">
                structured data
                <svg className="absolute left-0 right-0 -bottom-2 w-full" height="10" viewBox="0 0 200 10" preserveAspectRatio="none" aria-hidden>
                  <path d="M2 6 Q 50 1, 100 5 T 198 4" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
              </span>
              {' or assumptions?'}
            </WordReveal>
            <ScrollReveal delay={150} className="mt-10 flex justify-center">
              <TurnoverCalculator />
            </ScrollReveal>
            <ScrollReveal delay={250} className="mt-10 flex flex-wrap items-center justify-center gap-5">
              <MagneticButton href="/contact#snapshot" className="inline-flex items-center gap-2 bg-[#0D9488] text-white text-[14px] font-semibold px-5 py-3 rounded-xl hover:bg-[#0F766E] shadow-[0_8px_24px_-8px_rgba(13,148,136,0.6)] hover:shadow-[0_10px_32px_-8px_rgba(13,148,136,0.7)]">
                Get Your Free Financial Snapshot <ArrowRight className="w-4 h-4" />
              </MagneticButton>
              <Link href="/pricing" className="text-[#0D9488] text-[14px] font-semibold hover:underline underline-offset-4">
                See what it costs →
              </Link>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* === SECTION 2 — PROBLEM + SHIFT (merged side-by-side) === */}
      <section id="how-we-work" className="scroll-smooth-anchor relative bg-white py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* PROBLEM */}
            <ScrollReveal>
              <div className="rounded-2xl border border-[#E4E4E7] bg-white p-6 lg:p-8 h-full">
                <p className="text-xs uppercase tracking-[0.2em] text-[#71717A] font-bold">The problem</p>
                <h2 className="mt-3 font-display text-[24px] sm:text-[30px] lg:text-[34px] text-[#0F172A] font-bold tracking-[-0.02em] leading-[1.1]">
                  Everything exists. <span className="text-[#0D9488]">Nothing works together.</span>
                </h2>
                <div className="mt-6">
                  <ScatteredDashboard />
                </div>
                <p className="mt-6 text-[#71717A] text-[15px] leading-[1.7]">
                  Compliance lives in one place, your data sits in another, your decisions happen in a third. <span className="text-[#0F172A] font-medium">The gaps between them are where money leaks and risk builds silently.</span>
                </p>
              </div>
            </ScrollReveal>
            {/* SHIFT */}
            <ScrollReveal delay={120}>
              <div className="rounded-2xl border-2 border-[#0D9488]/20 bg-gradient-to-br from-[#F0FDFA] to-white p-6 lg:p-8 h-full">
                <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">The shift</p>
                <h2 className="mt-3 font-display text-[24px] sm:text-[30px] lg:text-[34px] text-[#0F172A] font-bold tracking-[-0.02em] leading-[1.1]">
                  Structure replaces <span className="text-[#0D9488]">fragmentation</span>.<br />Clarity replaces <span className="text-[#0D9488]">guesswork</span>.
                </h2>
                <div className="mt-6">
                  <UnifiedDashboard />
                </div>
                <p className="mt-6 text-[#71717A] text-[15px] leading-[1.7]">
                  When compliance feeds clean data and data drives decisions, your finance function stops being a cost center and becomes <span className="text-[#0D9488] font-semibold">a control system</span>.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* === SECTION 3 — LAYERED SERVICES (merged stack + services) === */}
      <section className="relative bg-[#F8FAFB] py-16 lg:py-24">
        <div className="absolute inset-0 dot-grid-faint opacity-40 pointer-events-none" aria-hidden />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">A layered problem. A layered solution.</p>
            <h2 className="mt-3 font-display text-[28px] sm:text-[36px] lg:text-[44px] font-bold tracking-[-0.02em] text-[#0F172A] max-w-3xl leading-[1.05]">
              Each layer solves a problem the one below it created. <span className="text-[#0D9488]">Hover a layer to see the service.</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={150} className="mt-10">
            <LayeredServices />
          </ScrollReveal>
        </div>
      </section>

      {/* === SECTION 3.5 — TESTIMONIALS === */}
      <Testimonials />

      {/* === SECTION 4 — TRUST SIGNALS (DARK) === */}
      <section className="relative bg-[#0F172A] text-white py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 dot-grid-dark opacity-40 pointer-events-none" aria-hidden />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.6), transparent 60%)' }} aria-hidden />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-[#14B8A6] font-bold text-center">Trust signals</p>
          </ScrollReveal>
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-4xl mx-auto">
            {[
              { value: 30, suffix: '+', label: 'Years of practice' },
              { value: 10, suffix: '+', label: 'Team members' },
              { value: 5, suffix: '', label: 'Industries served' },
              { value: 2, suffix: '', label: 'CA partners' },
            ].map((s, i) => (
              <ScrollReveal key={s.label} delay={i * 100}>
                <div className="text-center">
                  <div className="font-display text-[40px] lg:text-[54px] font-bold text-white tracking-[-0.03em] leading-none">
                    <AnimatedCounter value={s.value} suffix={s.suffix} />
                  </div>
                  <p className="mt-3 text-[13px] text-slate-400">{s.label}</p>
                  <div className="mt-3 h-px w-12 mx-auto bg-[#14B8A6]" />
                </div>
              </ScrollReveal>
            ))}
          </div>
          <ScrollReveal delay={500}>
            <p className="mt-14 text-[18px] sm:text-[20px] text-slate-200 leading-relaxed text-center max-w-3xl mx-auto">
              Founded by two Chartered Accountants — one bringing controllership and governance experience from <span className="text-[#5EEAD4] font-semibold">Goldman Sachs</span> and <span className="text-[#5EEAD4] font-semibold">Hillenbrand Inc.</span>, the other bringing deep tax compliance and execution discipline across manufacturing, services, education, and trading sectors.
            </p>
            <p className="mt-3 text-[14px] text-slate-400 text-center">Backed by an established practice of <span className="text-[#5EEAD4] font-semibold">30+ years</span>.</p>
          </ScrollReveal>
        </div>
      </section>

      {/* === SECTION 5 — CLOSING === */}
      <section className="relative bg-gradient-to-b from-white to-[#F0FDFA] py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 dot-grid-faint opacity-30 pointer-events-none" aria-hidden />
        <div className="relative max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <ScrollReveal>
            <h2 className="font-display text-[28px] sm:text-[40px] lg:text-[48px] italic text-[#0D9488] font-bold leading-[1.1] tracking-[-0.02em]">
              Control doesn’t come from doing more.<br />It comes from <span className="not-italic">structuring what already exists.</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={150} className="mt-8">
            <div className="mx-auto h-px w-16 bg-[#0D9488]" />
            <p className="mt-3 font-display text-[12px] tracking-[0.18em] uppercase text-[#0F766E] font-semibold">The Fiscal Fulcrum</p>
          </ScrollReveal>
          <ScrollReveal delay={250} className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <MagneticButton href="/contact" className="bg-[#0D9488] text-white font-semibold text-[14px] px-5 py-3 rounded-xl hover:bg-[#0F766E] shadow-[0_8px_24px_-8px_rgba(13,148,136,0.5)]">
              Start a Conversation
            </MagneticButton>
            <Link href="/contact#snapshot" className="border border-[#0D9488] text-[#0D9488] font-semibold text-[14px] px-5 py-3 rounded-xl hover:bg-[#F0FDFA] transition">
              Get Your Free Financial Snapshot
            </Link>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}
