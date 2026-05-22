import ScrollReveal from '@/components/site/ScrollReveal'
import MagneticButton from '@/components/site/MagneticButton'
import PartnerAvatar from '@/components/site/PartnerAvatar'
import { ArrowRight, Linkedin } from 'lucide-react'
import { MailTrigger } from '@/components/site/ContactModal'

export const metadata = {
  title: 'About The Fiscal Fulcrum | CA-Led Financial Intelligence | Coimbatore',
  description: 'Founded by CAs with experience across Goldman Sachs, Hillenbrand, and multinational environments. Specializing in manufacturing MSMEs.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About | The Fiscal Fulcrum',
    description: 'CA-led, technology-first finance practice based in Coimbatore.',
    url: 'https://www.fiscalfulcrum.in/about',
    type: 'website',
  },
}

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'The Fiscal Fulcrum LLP',
  url: 'https://www.fiscalfulcrum.in/',
  founder: [
    { '@type': 'Person', name: 'Sri Vaibhav V' },
    { '@type': 'Person', name: 'Mithuna D V' },
  ],
  foundingDate: '2026',
}

const partners = [
  {
    initials: 'SV',
    photo: '/team/vaibhav.jpg',
    firstName: 'Vaibhav',
    name: 'Sri Vaibhav V, CA',
    role: 'Designated Partner',
    email: 'vaibhav@svmd.in',
    linkedin: 'https://linkedin.com/in/sri-vaibhav',
    bio: 'Vaibhav is a Chartered Accountant who works with organisations to strengthen governance, internal controls, and financial operations. With experience across multinational and large-scale environments - including Goldman Sachs and Hillenbrand (a US-listed diversified industrial company) - his approach is structured and systems-driven, focused on building reliable frameworks that support scale and consistency.',
    focus: [
      'Controllership and financial close.',
      'Internal controls and governance frameworks (including SOX/ICFR).',
      'Internal and management audits.',
      'Investigations and process reviews.',
      'Financial systems and workflow optimisation.',
    ],
  },
  {
    initials: 'MD',
    photo: '/team/mithuna.jpg',
    firstName: 'Mithuna',
    name: 'Mithuna D V, CA',
    role: 'Designated Partner',
    email: 'mithuna@svmd.in',
    linkedin: 'https://linkedin.com/in/mithuna-d-v-61a842178',
    bio: 'Mithuna is a Chartered Accountant who works closely with businesses on tax compliance, financial planning, and documentation-driven processes. Her approach is organised and execution-focused, ensuring that statutory requirements are handled cleanly and consistently.',
    focus: [
      'Income Tax and GST compliance.',
      'Financial planning and projections.',
      'Budgeting and operational support.',
      'Documentation and bookkeeping structures.',
      'Experience across manufacturing, services, NGOs, education, and trading.',
    ],
  },
]

export default function AboutPage() {
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />

      <section className="hero-radial py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-semibold">About</p>
            <h1 className="mt-4 font-display text-[32px] sm:text-[44px] lg:text-[52px] font-bold text-[#0F172A] tracking-[-0.03em] leading-[1.05]">
              The <span className="text-[#0D9488]">Fiscal Fulcrum</span>
            </h1>
          </ScrollReveal>
        </div>
      </section>

      <section className="bg-white py-12 lg:py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 space-y-6">
          <ScrollReveal>
            <h2 className="font-display text-[28px] sm:text-[36px] lg:text-[44px] font-semibold text-[#0F172A] tracking-[-0.02em]">Who we are</h2>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <p className="text-[#71717A] text-[16px] leading-[1.7]">
              The Fiscal Fulcrum is a <span className="text-[#18181B] font-medium">Chartered Accountant led business</span> built around one conviction: finance should be a system, not a scramble. We work with manufacturing MSMEs, export-oriented businesses, and growing enterprises - delivering <span className="text-[#0D9488] font-semibold">structured compliance</span>, <span className="text-[#0D9488] font-semibold">financial intelligence</span>, <span className="text-[#0D9488] font-semibold">strategic advisory</span>, and <span className="text-[#0D9488] font-semibold">governance</span> through technology.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <p className="text-[18px] sm:text-[20px] text-[#3F3F46] leading-[1.6] pl-6 border-l-2 border-[#0D9488]">
              <span className="text-[#0D9488] font-semibold">We don&apos;t just manage your books.</span> We build the financial infrastructure your business runs on.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="bg-[#F8FAFB] py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="font-display text-[28px] sm:text-[36px] lg:text-[44px] font-semibold text-[#0F172A] tracking-[-0.02em]">
              Our <span className="text-[#0D9488]">approach</span>
            </h2>
          </ScrollReveal>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {[
              { t: 'Structure over effort', d: 'We build systems that handle recurring work automatically, so our team focuses on judgment - analysis, strategy, and problem-solving.' },
              { t: 'Visibility over reporting', d: 'A live dashboard you can check on your phone - that is visibility. We design deliverables for how business owners actually consume information.' },
              { t: 'Depth over breadth', d: 'We specialize in manufacturing, precision engineering, auto components, textiles, and export-oriented MSMEs. We would rather know your industry deeply than serve every industry superficially.' },
            ].map((p, i) => (
              <ScrollReveal key={p.t} delay={i * 100}>
                <div className="service-card rounded-2xl border border-[#E4E4E7] bg-white p-7 h-full transition-all duration-200">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">0{i + 1}</p>
                  <h3 className="mt-3 font-display text-[18px] sm:text-[20px] font-semibold text-[#0F172A]">{p.t}</h3>
                  <p className="mt-3 text-[#71717A] text-[15px] leading-[1.65]">{p.d}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="font-display text-[28px] sm:text-[36px] lg:text-[44px] font-semibold text-[#0F172A] tracking-[-0.02em]">Founding Partners</h2>
          </ScrollReveal>
          <div className="mt-12 grid md:grid-cols-2 gap-8 lg:gap-10">
            {partners.map((p, i) => (
              <ScrollReveal key={p.name} delay={i * 150}>
                <div className="rounded-2xl border border-[#E4E4E7] bg-white p-8 h-full hover:shadow-lg hover:border-[#0D9488]/40 transition-all duration-200">
                  <div className="flex flex-col items-start gap-6">
                    <PartnerAvatar src={p.photo} alt={'Portrait of ' + p.name} initials={p.initials} width={260} />
                    <div className="w-full">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-display text-[22px] sm:text-[26px] font-bold text-[#0F172A] tracking-tight">{p.name}</h3>
                          <p className="mt-1 text-[14px] text-[#0D9488] font-semibold uppercase tracking-wider">{p.role}</p>
                        </div>
                        <a href={p.linkedin} target="_blank" rel="noopener noreferrer" aria-label={'LinkedIn - ' + p.name} className="flex-shrink-0 w-10 h-10 rounded-lg border border-[#E4E4E7] flex items-center justify-center text-[#71717A] hover:text-[#0D9488] hover:border-[#0D9488] transition">
                          <Linkedin className="w-4 h-4" />
                        </a>
                      </div>
                      <div className="mt-3">
                        <MailTrigger email={p.email} className="text-[14px] text-[#71717A]">Email {p.firstName}</MailTrigger>
                      </div>
                      <p className="mt-5 text-[#3F3F46] text-[15px] leading-[1.7]">{p.bio}</p>
                    </div>
                  </div>
                  <p className="mt-7 text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">Areas of focus</p>
                  <ul className="mt-3 grid sm:grid-cols-2 gap-x-4 gap-y-2">
                    {p.focus.map(f => (
                      <li key={f} className="flex gap-2 text-[14px] text-[#3F3F46]">
                        <span className="text-[#0D9488] mt-0.5">{'•'}</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F8FAFB] py-12 lg:py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center space-y-8">
          <ScrollReveal>
            <p className="text-[#71717A] text-[16px] leading-[1.7]">
              Founded by two Chartered Accountants - one with controllership and governance experience across <span className="text-[#0D9488] font-semibold">Goldman Sachs</span> and <span className="text-[#0D9488] font-semibold">Hillenbrand Inc.</span>, the other with deep tax compliance and execution discipline across manufacturing, services, education, and trading sectors. The Fiscal Fulcrum is backed by an established practice with <span className="text-[#0D9488] font-semibold">over 30 years</span> in traditional CA practice and a team of <span className="text-[#0D9488] font-semibold">10+ professionals</span>. <span className="text-[#18181B] font-medium">We are not starting from zero.</span> We are building on a foundation that has already earned trust, and adding the technology, specialization, and delivery model that the next decade of business demands.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={150}>
            <p className="font-display text-[20px] sm:text-[26px] lg:text-[30px] italic text-[#0D9488] font-medium leading-[1.3]">
              The finance profession in India is at an inflection point. The firms that will matter in 2030 are not the ones with the most clients - they are the ones whose clients cannot imagine operating without them. <span className="not-italic font-semibold">That is what we are building toward.</span>
            </p>
          </ScrollReveal>
          <ScrollReveal delay={250}>
            <MagneticButton href="/contact" className="inline-flex items-center gap-2 bg-[#0D9488] text-white font-semibold text-[14px] px-5 py-3 rounded-xl hover:bg-[#0F766E] shadow-[0_8px_24px_-8px_rgba(13,148,136,0.5)]">
              Start a Conversation <ArrowRight className="w-4 h-4" />
            </MagneticButton>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}
