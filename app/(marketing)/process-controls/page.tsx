import Link from 'next/link'
import ScrollReveal from '@/components/site/ScrollReveal'
import WhereThisFits from '@/components/site/WhereThisFits'
import MagneticButton from '@/components/site/MagneticButton'
import { ArrowRight, Check } from 'lucide-react'

export const metadata = {
  title: 'SOX Compliance & Internal Controls | ICFR for Indian Companies | The Fiscal Fulcrum',
  description: 'SOX readiness, ICFR implementation, and governance frameworks for Indian subsidiaries and scaling businesses. Process-driven. Audit-ready.',
  alternates: { canonical: '/process-controls' },
  openGraph: {
    title: 'Process & Controls - SOX/ICFR | The Fiscal Fulcrum',
    description: 'SOX readiness, ICFR implementation, and governance frameworks. Process-driven. Audit-ready.',
    url: 'https://www.fiscalfulcrum.in/process-controls',
    type: 'website',
  },
}

const questions = [
  'Can you trace a transaction from initiation to final approval - with every step documented?',
  'Do you know who approved what, and when?',
  'Are your processes consistent - or dependent on individual people?',
  'If an auditor walked in tomorrow, would they find a system or a set of workarounds?',
]

export default function ProcessControlsPage() {
  return (
    <div>
      <section className="hero-radial py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-semibold">The trust layer</p>
            <h1 className="mt-4 font-display text-[32px] sm:text-[44px] lg:text-[52px] font-bold text-[#0F172A] tracking-[-0.03em] leading-[1.05]">
              Process <span className="text-[#0D9488]">&amp; Controls</span>
            </h1>
          </ScrollReveal>
        </div>
      </section>

      <section className="bg-white py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            <ScrollReveal>
              <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">Four questions</p>
              <h2 className="mt-3 font-display text-[24px] sm:text-[30px] lg:text-[34px] font-bold text-[#0F172A] tracking-[-0.02em] leading-[1.15]">
                If something goes wrong, can you explain exactly why it happened?
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
              <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">Why this layer exists</p>
              <h2 className="mt-3 font-display text-[24px] sm:text-[30px] lg:text-[34px] font-bold text-[#0F172A] tracking-[-0.02em] leading-[1.15]">
                The trust layer. <span className="text-[#0D9488]">Proof that your financial house is not just structured - it is verifiable.</span>
              </h2>
              <p className="mt-5 text-[#71717A] text-[16px] leading-[1.7]">
                There is a point in every business&apos;s growth where informal processes stop working. <span className="text-[#0F172A] font-medium">Process &amp; Controls is the layer that makes your financial system not just structured, but provable.</span>
              </p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="bg-[#F8FAFB] py-12 lg:py-20">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 space-y-6">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">SOX / ICFR</p>
            <h2 className="mt-3 font-display text-[28px] sm:text-[36px] lg:text-[40px] font-bold text-[#0F172A] tracking-[-0.02em] leading-[1.1]">
              For US-facing businesses, this aligns directly with <span className="text-[#0D9488]">SOX requirements.</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <p className="text-[#71717A] text-[16px] leading-[1.7]">
              If your company is a subsidiary of a US-listed entity, <span className="text-[#0F172A] font-semibold">SOX Section 404 is not optional</span>. Management must assess and report annually on the effectiveness of internal controls over financial reporting (ICFR):
            </p>
            <ul className="mt-4 space-y-2.5">
              {['Every material financial process must be documented.', 'Key controls must be identified, tested, and evidenced.', 'Deficiencies must be classified and remediated.', 'The auditor must walk through controls and verify they operate as designed.'].map(t => (
                <li key={t} className="flex gap-3 text-[#71717A] text-[15px] leading-[1.6]">
                  <Check className="w-5 h-5 text-[#0D9488] flex-shrink-0 mt-0.5" /> <span>{t}</span>
                </li>
              ))}
            </ul>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <h3 className="mt-2 font-display text-[20px] font-semibold text-[#0F172A]">What we do for SOX / ICFR</h3>
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              {[
                { t: 'Process mapping', d: 'Document key processes (order-to-cash, procure-to-pay, financial close, payroll, treasury).' },
                { t: 'Control identification', d: 'Define preventive and detective controls at each risk point.' },
                { t: 'Testing', d: 'Design and execute test plans for operating effectiveness.' },
                { t: 'Gap remediation', d: 'Identify deficiencies, classify severity, recommend and implement fixes.' },
                { t: 'Audit readiness', d: 'Prepare management assertion, coordinate with external auditors, walkthrough-ready documentation.' },
              ].map(item => (
                <div key={item.t} className="rounded-xl border border-[#E4E4E7] bg-white p-4">
                  <p className="text-[14px] font-semibold text-[#0F172A]">{item.t}</p>
                  <p className="mt-1 text-[14px] text-[#71717A] leading-[1.55]">{item.d}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
          <ScrollReveal delay={300}>
            <div className="rounded-xl border-l-4 border-[#0D9488] border border-[#E4E4E7] bg-white p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">Phase 1 - First 30 days</p>
              <p className="mt-2 text-[15px] text-[#3F3F46] leading-[1.6]">Process walkthrough, control inventory, and gap assessment report.</p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="bg-white py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            <ScrollReveal>
              <h2 className="font-display text-[24px] sm:text-[32px] lg:text-[36px] font-semibold text-[#0F172A] tracking-[-0.02em]">Beyond SOX</h2>
              <p className="mt-3 text-[#71717A] text-[15px] leading-[1.7]">
                Even if you are not SOX-mandated, structured controls help you:
              </p>
              <ul className="mt-5 space-y-2.5">
                {['Prevent fraud and financial misstatement.', 'Ensure consistency as you hire and scale.', 'Satisfy lender covenants and investor due diligence.', 'Reduce key-person dependency.', 'Pass audits without last-minute scrambles.'].map(t => (
                  <li key={t} className="flex gap-2.5 text-[15px] text-[#3F3F46] leading-[1.55]">
                    <Check className="w-4 h-4 text-[#0D9488] flex-shrink-0 mt-1" /><span>{t}</span>
                  </li>
                ))}
              </ul>
            </ScrollReveal>
            <ScrollReveal delay={150}>
              <h2 className="font-display text-[24px] sm:text-[32px] lg:text-[36px] font-semibold text-[#0F172A] tracking-[-0.02em]">Who this is for</h2>
              <ul className="mt-8 space-y-2.5">
                {[
                  'Indian subsidiaries of US-listed companies requiring SOX 404 compliance.',
                  'Companies preparing for IPO that need governance-grade processes.',
                  'Businesses undergoing investor due diligence or institutional lending.',
                  'Manufacturing companies scaling from founder-led operations to professional management.',
                  'Any business that has had a financial surprise and resolved to never have another one.',
                ].map(t => (
                  <li key={t} className="flex gap-2.5 text-[15px] text-[#3F3F46] leading-[1.55]">
                    <Check className="w-4 h-4 text-[#0D9488] flex-shrink-0 mt-1" /><span>{t}</span>
                  </li>
                ))}
              </ul>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <WhereThisFits current="controls" />

      <section className="bg-[#F8FAFB] py-12 lg:py-20">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 space-y-6">
          <ScrollReveal>
            <div className="rounded-2xl border-l-4 border-[#0D9488] border border-[#E4E4E7] bg-white p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">This is not theoretical for us</p>
              <p className="mt-3 text-[#71717A] text-[16px] leading-[1.7]">
                Our founding team experience includes <span className="text-[#0F172A] font-semibold">SOX designing, compliance &amp; testing at Hillenbrand</span> (a US-listed diversified industrial company) and <span className="text-[#0F172A] font-semibold">controllership with process compliance at Goldman Sachs</span>. Grounded in direct, hands-on experience with what auditors expect.
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={150}>
            <div className="rounded-2xl border-2 border-[#0D9488] bg-white p-6 lg:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">Pricing</p>
                <p className="mt-2 font-display text-[22px] sm:text-[26px] font-bold text-[#0F172A] leading-[1.2]">
                  One-time engagements from <span className="text-[#0D9488]">Rs.2 L</span> to <span className="text-[#0D9488]">Rs.10 L+</span>.
                </p>
                <p className="mt-2 text-[14px] text-[#71717A] leading-[1.6] max-w-xl">
                  Scope-dependent. Use the pricing builder to size your engagement; we confirm the final fee in a 15-minute scoping call.
                </p>
              </div>
              <Link href="/pricing" className="flex-shrink-0 inline-flex items-center gap-2 bg-[#0D9488] text-white font-semibold text-[14px] px-5 py-3 rounded-xl hover:bg-[#0F766E] transition shadow-[0_8px_24px_-8px_rgba(13,148,136,0.5)]">
                See full pricing <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={250} className="text-center pt-6">
            <p className="font-display text-[24px] sm:text-[32px] lg:text-[36px] italic text-[#0D9488] font-bold leading-[1.15]">
              Without control, growth creates risk. With control, it becomes sustainable.
            </p>
            <div className="mt-8">
              <MagneticButton href="/contact" className="inline-flex items-center gap-2 bg-[#0D9488] text-white font-semibold text-[14px] px-5 py-3 rounded-xl hover:bg-[#0F766E] shadow-[0_8px_24px_-8px_rgba(13,148,136,0.5)]">
                Schedule a Scoping Call <ArrowRight className="w-4 h-4" />
              </MagneticButton>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}
