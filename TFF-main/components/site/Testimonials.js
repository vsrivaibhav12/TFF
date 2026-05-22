'use client'
import ScrollReveal from './ScrollReveal'

const items = [
  {
    quote:
      "They handle our GST, TDS and IT together. Earlier I had three different people telling me three different stories at the end of every month. Now it's one team, one set of numbers.",
    role: 'Promoter',
    sector: 'Auto-component manufacturing',
    location: 'Coimbatore',
  },
  {
    quote:
      "Their internal controls review found three gaps in our P2P process that we'd lived with for years. Honestly didn't think we had a problem until they showed us the workpaper. We fixed all three before the next audit.",
    role: 'Finance head',
    sector: 'Precision engineering',
    location: 'Tirupur',
  },
  {
    quote:
      "What I appreciate is they explain the numbers. Most CAs send a P&L. They sit and walk through what BizLens is showing - where margin is leaking, why receivables are stuck. That kind of help is rare.",
    role: 'Director',
    sector: 'Textiles & garments',
    location: 'Erode',
  },
]

export default function Testimonials() {
  return (
    <section className="bg-[#F8FAFB] py-16 lg:py-24 relative overflow-hidden">
      <div className="absolute inset-0 dot-grid-faint opacity-30 pointer-events-none" aria-hidden />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <ScrollReveal>
          <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold text-center">From the practice</p>
          <h2 className="mt-3 font-display text-[28px] sm:text-[36px] lg:text-[40px] font-bold tracking-[-0.02em] text-[#0F172A] text-center max-w-3xl mx-auto leading-[1.1]">
            What our clients <span className="text-[#0D9488]">actually say</span>
          </h2>
        </ScrollReveal>
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {items.map((t, i) => (
            <ScrollReveal key={i} delay={i * 120}>
              <figure className="relative h-full rounded-2xl border border-[#E4E4E7] bg-white p-6 lg:p-7 hover:shadow-md hover:border-[#0D9488]/40 transition-all duration-200">
                <span aria-hidden className="block font-display text-[64px] leading-none text-[#0D9488]/15 -mb-6">&ldquo;</span>
                <blockquote className="text-[15px] sm:text-[16px] text-[#3F3F46] leading-[1.7]">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-5 pt-5 border-t border-[#E4E4E7]">
                  <p className="text-[13px] font-semibold text-[#0F172A]">{t.role}</p>
                  <p className="mt-0.5 text-[12px] text-[#71717A]">{t.sector} &middot; {t.location}</p>
                </figcaption>
              </figure>
            </ScrollReveal>
          ))}
        </div>
        <p className="mt-8 text-center text-[12px] text-[#A1A1AA] max-w-2xl mx-auto">
          Names withheld at client request. Direct references available on enquiry.
        </p>
      </div>
    </section>
  )
}
