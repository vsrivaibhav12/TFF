'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Linkedin } from 'lucide-react'
import { insightArticles, type InsightArticle } from '@/lib/content/insights'

const categories = ['All', 'Compliance', 'Virtual CFO', 'CBAM & ESG', 'Process & Controls']

export default function InsightsClient() {
  const [active, setActive] = useState('All')

  const filtered = active === 'All'
    ? insightArticles
    : insightArticles.filter((a: InsightArticle) => a.category === active)

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition ${active === c ? 'bg-[#0D9488] text-white border-[#0D9488]' : 'border-[#E4E4E7] text-[#3F3F46] hover:border-[#0D9488] hover:text-[#0D9488]'}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-16">
        {filtered.length === 0 ? (
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex w-14 h-14 rounded-full bg-[#F0FDFA] text-[#0D9488] items-center justify-center mb-6">
              <span className="text-xl">—</span>
            </div>
            <p className="text-[#71717A] text-[18px] leading-[1.7]">
              Our first articles are coming soon. Follow us on LinkedIn for regular insights.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href="https://linkedin.com/in/sri-vaibhav" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-[#E4E4E7] hover:border-[#0D9488] hover:text-[#0D9488] text-[#3F3F46] px-4 py-2 rounded-lg transition">
                <Linkedin className="w-4 h-4" /> Sri Vaibhav
              </a>
              <a href="https://linkedin.com/in/mithuna-d-v-61a842178" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-[#E4E4E7] hover:border-[#0D9488] hover:text-[#0D9488] text-[#3F3F46] px-4 py-2 rounded-lg transition">
                <Linkedin className="w-4 h-4" /> Mithuna D V
              </a>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((a: InsightArticle) => (
              <Link key={a.slug} href={`/insights/${a.slug}`} className="service-card block rounded-xl border border-[#E4E4E7] bg-white p-6 hover:shadow-md hover:border-[#0D9488]/40 transition-all">
                <span className="inline-block text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">{a.category}</span>
                <h3 className="mt-3 text-[20px] font-semibold text-[#18181B]">{a.title}</h3>
                <p className="mt-2 text-[14px] text-[#A1A1AA]">{a.date}</p>
                <p className="mt-3 text-[15px] text-[#71717A] leading-[1.65] line-clamp-2">{a.excerpt}</p>
                <p className="mt-5 text-[#0D9488] text-sm font-semibold">Read →</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
