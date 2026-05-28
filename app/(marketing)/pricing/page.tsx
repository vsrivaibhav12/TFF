import ScrollReveal from '@/components/site/ScrollReveal'
import PricingBuilder from '@/components/site/PricingBuilder'
import MagneticButton from '@/components/site/MagneticButton'
import { ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'Pricing | The Fiscal Fulcrum',
  description: 'Transparent monthly retainers and one-time engagement pricing. Build your plan, see your monthly commitment, and talk to us when you are ready.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing | The Fiscal Fulcrum',
    description: 'Build your plan. See your monthly commitment. Talk to us when you are ready.',
    url: 'https://www.fiscalfulcrum.in/pricing',
    type: 'website',
  },
}

export default function PricingPage() {
  return (
    <div>
      {/* HERO */}
      <section className="hero-radial py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-semibold">Pricing</p>
            <h1 className="mt-4 font-display text-[32px] sm:text-[44px] lg:text-[52px] font-bold text-[#0F172A] tracking-[-0.03em] leading-[1.05]">
              Pick the layers you need. <span className="text-[#0D9488]">See your number.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-[#71717A] text-[16px] leading-[1.7]">
              No demos to sit through. No quotes to chase. Toggle the services you want on the right; the total updates as you go. When you're ready, we confirm the final fee in a 15-minute call.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* BUILDER */}
      <section className="bg-[#F8FAFB] py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <PricingBuilder />
          </ScrollReveal>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-white py-12 lg:py-20">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">How engagement works</p>
            <h2 className="mt-3 font-display text-[28px] sm:text-[36px] lg:text-[40px] font-bold text-[#0F172A] tracking-[-0.02em] leading-[1.1]">
              From first call to first month — <span className="text-[#0D9488]">two weeks.</span>
            </h2>
          </ScrollReveal>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { n: '01', t: '15-min scoping call', d: 'We understand your business, current setup, and pain points. No sales pitch.' },
              { n: '02', t: 'Written proposal',   d: 'A short proposal with confirmed scope, fees, and start date — usually within 48 hours.' },
              { n: '03', t: 'System setup',       d: 'We onboard your data, set up the dashboard, and align with your team. 7–10 days.' },
              { n: '04', t: 'First cycle live',   d: 'Your first structured filing or insight memo lands. Subscription clock starts here.' },
            ].map((s, i) => (
              <ScrollReveal key={s.n} delay={i * 100}>
                <div className="rounded-2xl border border-[#E4E4E7] bg-white p-6 h-full">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">{s.n}</p>
                  <h3 className="mt-3 font-display text-[16px] font-semibold text-[#0F172A]">{s.t}</h3>
                  <p className="mt-2 text-[#71717A] text-[14px] leading-[1.6]">{s.d}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT'S INCLUDED IN EVERY ENGAGEMENT */}
      <section className="bg-[#F8FAFB] py-12 lg:py-20">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">In every plan</p>
            <h2 className="mt-3 font-display text-[28px] sm:text-[36px] lg:text-[40px] font-bold text-[#0F172A] tracking-[-0.02em] leading-[1.1]">
              The basics — never extra.
            </h2>
          </ScrollReveal>
          <div className="mt-10 grid md:grid-cols-2 gap-4">
            {[
              { t: 'A live portal',                  d: 'Track every filing, every workpaper, every deliverable as it moves.' },
              { t: 'A dedicated point of contact',   d: 'One person who knows your business — not a rotating shared inbox.' },
              { t: 'No surprises in the bill',       d: 'Fixed monthly fee for the scope agreed. Anything new is quoted before work starts.' },
              { t: 'You own your data, always',      d: 'Full export of your books, filings, and reports — yours, on demand, no questions asked.' },
            ].map((b, i) => (
              <ScrollReveal key={b.t} delay={i * 100}>
                <div className="rounded-xl bg-white border border-[#E4E4E7] p-5 h-full flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center text-[13px] font-bold">{i + 1}</span>
                  <div>
                    <p className="text-[15px] font-semibold text-[#0F172A]">{b.t}</p>
                    <p className="mt-1 text-[#71717A] text-[14px] leading-[1.6]">{b.d}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CLOSING */}
      <section className="bg-white py-12 lg:py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <ScrollReveal>
            <h2 className="font-display text-[28px] sm:text-[40px] lg:text-[48px] italic text-[#0D9488] font-bold leading-[1.1] tracking-[-0.02em]">
              Honest fees. Clear scope. <span className="not-italic">No mystery.</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={150} className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <MagneticButton href="/contact" className="inline-flex items-center gap-2 bg-[#0D9488] text-white font-semibold text-[14px] px-5 py-3 rounded-xl hover:bg-[#0F766E] shadow-[0_8px_24px_-8px_rgba(13,148,136,0.5)]">
              Start a Conversation <ArrowRight className="w-4 h-4" />
            </MagneticButton>
            <MagneticButton href="/contact#snapshot" className="inline-flex items-center gap-2 border border-[#0D9488] text-[#0D9488] font-semibold text-[14px] px-5 py-3 rounded-xl hover:bg-[#F0FDFA]">
              Get Your Free Financial Snapshot
            </MagneticButton>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}
