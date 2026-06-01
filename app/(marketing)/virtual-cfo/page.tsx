import Link from 'next/link'
import ScrollReveal from '@/components/site/ScrollReveal'
import WhereThisFits from '@/components/site/WhereThisFits'
import MagneticButton from '@/components/site/MagneticButton'
import { ArrowRight, Check, BarChart3, Sliders, TrendingUp, MessageSquare, Activity, GitBranch } from 'lucide-react'

export const metadata = {
  title: 'Virtual CFO for Manufacturing MSMEs | BizLens Analytics | The Fiscal Fulcrum',
  description: 'Strategic financial leadership powered by proprietary analytics. Cash flow, working capital, profitability — structured, measured, and acted on. From ₹25,000/month.',
  alternates: { canonical: '/virtual-cfo' },
  openGraph: {
    title: 'Virtual CFO powered by BizLens | The Fiscal Fulcrum',
    description: 'Strategic financial leadership powered by proprietary analytics. From ₹25,000/month.',
    url: 'https://www.fiscalfulcrum.in/virtual-cfo',
    type: 'website',
  },
}

const questions = [
  'Are you making cash profits — or just accounting profits?',
  'If sales increase by 20%, do you know what happens to your cash?',
  'Before taking a decision, can you model its financial impact?',
  'If your lender asks for a 90-day cash flow forecast tomorrow, can you produce one?',
]

const bizlensFeatures = [
  { icon: Activity, label: 'Health scoring' },
  { icon: Sliders, label: 'Scenario simulation' },
  { icon: TrendingUp, label: 'Trend analysis' },
  { icon: MessageSquare, label: 'Plain-English insights' },
]

export default function VirtualCFOPage() {
  return (
    <div>
      {/* HERO */}
      <section className="hero-radial py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-semibold">Visibility into action</p>
            <h1 className="mt-4 font-display text-[32px] sm:text-[44px] lg:text-[52px] font-bold text-[#0F172A] tracking-[-0.03em] leading-[1.05]">
              Virtual CFO — <span className="text-[#0D9488]">Powered by BizLens</span>
            </h1>
          </ScrollReveal>
        </div>
      </section>

      {/* QUESTIONS + GAP — merged */}
      <section className="bg-white py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            <ScrollReveal>
              <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">Four questions</p>
              <h2 className="mt-3 font-display text-[24px] sm:text-[30px] lg:text-[34px] font-bold text-[#0F172A] tracking-[-0.02em] leading-[1.15]">
                Are you actually in control of your numbers?
              </h2>
              <div className="mt-6 space-y-2">
                {questions.map((q) => (
                  <p key={q} className="text-[15px] sm:text-[16px] text-[#0F172A] leading-snug border-l-2 border-[#E4E4E7] hover:border-[#0D9488] transition pl-5 py-1.5">
                    {q}
                  </p>
                ))}
              </div>
            </ScrollReveal>
            <ScrollReveal delay={150}>
              <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">The gap</p>
              <h2 className="mt-3 font-display text-[24px] sm:text-[30px] lg:text-[34px] font-bold text-[#0F172A] tracking-[-0.02em] leading-[1.15]">
                Most businesses have the data. <span className="text-[#0D9488]">They just don't use it to run the business.</span>
              </h2>
              <p className="mt-6 text-[#71717A] text-[16px] leading-[1.7]">
                Your Tally has years of transactions. <span className="text-[#0F172A] font-medium">But between your data and your decisions, there is a gap</span> — and that gap is where margin erodes and cash gets stuck.
              </p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* WHAT THIS IS — side-by-side cards */}
      <section className="bg-[#F8FAFB] py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <ScrollReveal>
              <h2 className="font-display text-[24px] sm:text-[32px] lg:text-[36px] font-semibold text-[#0F172A] tracking-[-0.02em] leading-tight">
                This is where numbers turn into <span className="text-[#0D9488]">decisions</span>.
              </h2>
              <p className="mt-5 text-[16px] sm:text-[17px] text-[#3F3F46] leading-[1.65]">
                <span className="text-[#0D9488] font-semibold">BizLens</span> gives you clarity. <span className="text-[#0D9488] font-semibold">Virtual CFO</span> uses that clarity to guide action.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={150}>
              <div className="space-y-4">
                <div className="rounded-xl border border-[#E4E4E7] bg-white p-5">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#0D9488]" />
                    <p className="font-display font-semibold text-[16px] text-[#0F172A]">BizLens</p>
                  </div>
                  <p className="mt-2 text-[14px] text-[#71717A] leading-[1.65]">Proprietary analytics engine that transforms your financial data into structured insights — updated monthly, accessible through your portal.</p>
                </div>
                <div className="rounded-xl border border-[#E4E4E7] bg-white p-5">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-[#0D9488]" />
                    <p className="font-display font-semibold text-[16px] text-[#0F172A]">Virtual CFO</p>
                  </div>
                  <p className="mt-2 text-[14px] text-[#71717A] leading-[1.65]">A Chartered Accountant who reads the analytics, identifies risks, and works with you on decisions — every month, not once a year.</p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section className="bg-white py-12 lg:py-20">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="font-display text-[28px] sm:text-[36px] lg:text-[44px] font-semibold text-[#0F172A] tracking-[-0.02em]">What you get</h2>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div className="mt-8 rounded-xl bg-white border-l-4 border-[#0D9488] border border-[#E4E4E7] p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">First 30 Days</p>
              <h3 className="mt-2 font-display text-[20px] font-semibold text-[#0F172A]">Deep Dive Audit</h3>
              <p className="mt-2 text-[#71717A] text-[15px] leading-[1.65]">A comprehensive review of your financial operations — where money flows, where it stalls, where it leaks. You receive a written diagnostic with specific findings and a 90-day action plan.</p>
            </div>
          </ScrollReveal>
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <ScrollReveal delay={150}>
              <div className="rounded-xl border border-[#E4E4E7] bg-white p-6 h-full">
                <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">Every Month</p>
                <ul className="mt-4 space-y-2.5">
                  {['BizLens analytics refresh.', 'Written Insight Memo with 3–5 actionable observations.', 'Solution Log update — issues, actions, value created.', 'Monthly review call with your designated vCFO.'].map(t => (
                    <li key={t} className="flex gap-2 text-[14px] text-[#71717A] leading-[1.6]">
                      <Check className="w-4 h-4 text-[#0D9488] flex-shrink-0 mt-0.5" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={250}>
              <div className="rounded-xl border border-[#E4E4E7] bg-white p-6 h-full">
                <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">Every Quarter</p>
                <ul className="mt-4 space-y-2.5">
                  {['Strategic deep-dive session.', 'Budget vs actual variance analysis.', 'Forward-looking 90-day plan update.', 'Board-ready financial summary if needed.'].map(t => (
                    <li key={t} className="flex gap-2 text-[14px] text-[#71717A] leading-[1.6]">
                      <Check className="w-4 h-4 text-[#0D9488] flex-shrink-0 mt-0.5" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* WHO + EXAMPLE — merged */}
      <section className="bg-[#F8FAFB] py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            <ScrollReveal>
              <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">Who this is for</p>
              <h2 className="mt-3 font-display text-[24px] sm:text-[30px] lg:text-[34px] font-bold text-[#0F172A] tracking-[-0.02em] leading-[1.15]">
                This is not for everyone. <span className="text-[#0D9488]">And that's by design.</span>
              </h2>
              <div className="mt-6 grid sm:grid-cols-2 gap-3">
                {[
                  'Businesses doing ₹5 Cr+ turnover who have outgrown their CA but are not ready for a full-time CFO.',
                  'Manufacturing companies where working capital, inventory, and receivables are the difference between growth and cash crunch.',
                  'Export-oriented businesses navigating CBAM, foreign exchange, and multi-market complexity.',
                  'Family-run businesses preparing for the next stage — institutional funding, second generation, or disciplined operations.',
                ].map((t) => (
                  <div key={t} className="rounded-xl border border-[#E4E4E7] bg-white p-4 text-[14px] text-[#71717A] leading-[1.6]">{t}</div>
                ))}
              </div>
            </ScrollReveal>
            <ScrollReveal delay={150}>
              <div className="rounded-xl bg-white border-l-4 border-[#0D9488] border border-[#E4E4E7] p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">A Real Example</p>
                <p className="mt-3 text-[16px] sm:text-[18px] text-[#0F172A] leading-[1.55]">
                  A Coimbatore auto-component manufacturer discovered <span className="font-bold text-[#0D9488]">₹18 lakh</span> in working capital locked in 90+ day receivables. Within one quarter of structured follow-up and collection redesign, recovery improved by <span className="font-bold text-[#0D9488]">40%</span>. The fix was not complex. <span className="font-medium">The visibility was what was missing.</span>
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* BIZLENS — compressed */}
      <section className="bg-white py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <ScrollReveal>
              <h2 className="font-display text-[28px] sm:text-[36px] lg:text-[44px] font-semibold text-[#0F172A] tracking-[-0.02em]">
                <span className="text-[#0D9488]">BizLens</span> — the engine
              </h2>
              <p className="mt-4 text-[#71717A] text-[16px] leading-[1.7]">
                A purpose-built financial intelligence tool for Indian MSMEs. Takes structured inputs — P&amp;L, balance sheet, ageing, concentration — and turns them into action.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={150}>
              <div className="grid grid-cols-2 gap-3">
                {bizlensFeatures.map(f => {
                  const Icon = f.icon
                  return (
                    <div key={f.label} className="rounded-xl border border-[#E4E4E7] bg-white p-4 flex items-center gap-3">
                      <span className="w-9 h-9 rounded-lg bg-[#F0FDFA] flex items-center justify-center text-[#0D9488]">
                        <Icon className="w-4 h-4" />
                      </span>
                      <p className="text-[14px] font-semibold text-[#0F172A]">{f.label}</p>
                    </div>
                  )
                })}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* WHERE THIS FITS */}
      <WhereThisFits current="vcfo" />

      {/* PRICING NUDGE */}
      <section className="bg-[#F8FAFB] py-12 lg:py-16">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="rounded-2xl border-2 border-[#0D9488] bg-white p-6 lg:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">Pricing</p>
              <p className="mt-2 font-display text-[22px] sm:text-[26px] font-bold text-[#0F172A] leading-[1.2]">
                Virtual CFO from <span className="text-[#0D9488]">₹25,000/month</span> · BizLens standalone from <span className="text-[#0D9488]">₹4,999/month</span>.
              </p>
              <p className="mt-2 text-[14px] text-[#71717A] leading-[1.6] max-w-xl">
                <span className="text-[#0D9488] font-semibold">Most engagements recover their cost in the first quarter</span> through working capital and pricing corrections alone.
              </p>
            </div>
            <Link href="/pricing" className="flex-shrink-0 inline-flex items-center gap-2 bg-[#0D9488] text-white font-semibold text-[14px] px-5 py-3 rounded-xl hover:bg-[#0F766E] transition shadow-[0_8px_24px_-8px_rgba(13,148,136,0.5)]">
              See full pricing <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CLOSING */}
      <section className="bg-white py-12 lg:py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <ScrollReveal>
            <p className="font-display text-[24px] sm:text-[34px] lg:text-[40px] italic text-[#0D9488] font-bold leading-[1.15]">
              You don't react to numbers. You use them.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <MagneticButton href="/contact" className="inline-flex items-center gap-2 bg-[#0D9488] text-white font-semibold text-[14px] px-5 py-3 rounded-xl hover:bg-[#0F766E] shadow-[0_8px_24px_-8px_rgba(13,148,136,0.5)]">
                Book a Discovery Call <ArrowRight className="w-4 h-4" />
              </MagneticButton>
              <Link href="/contact#snapshot" className="text-[#0D9488] text-sm font-semibold hover:underline">
                Get a free Financial Health Snapshot →
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}
