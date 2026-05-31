import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'

// Future-ready stub. Articles will be looked up here.
const articles: Record<string, any> = {}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const a = articles[params.slug]
  if (!a) return { title: 'Article — The Fiscal Fulcrum' }
  return {
    title: `${a.title} | The Fiscal Fulcrum Insights`,
    description: a.excerpt,
  }
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const a = articles[params.slug]
  if (!a) return notFound()
  return (
    <article className="bg-white py-24">
      <div className="max-w-3xl mx-auto px-6 lg:px-8">
        <Link href="/insights" className="inline-flex items-center gap-2 text-[#0D9488] text-sm font-semibold hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Insights
        </Link>
        <p className="mt-8 text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">{a.category}</p>
        <h1 className="mt-3 text-[40px] sm:text-[56px] font-bold text-[#18181B] tracking-tight leading-[1.05]">{a.title}</h1>
        <p className="mt-3 text-[14px] text-[#A1A1AA]">{a.date}</p>
        <div className="mt-10 prose prose-lg text-[#71717A] leading-[1.7]">{a.body}</div>
      </div>
    </article>
  )
}
