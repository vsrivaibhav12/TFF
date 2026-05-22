export default function sitemap() {
  const base = 'https://www.fiscalfulcrum.in'
  const now = new Date()
  const paths = ['', '/compliance', '/virtual-cfo', '/cbam', '/process-controls', '/pricing', '/about', '/insights', '/contact']
  return paths.map((p) => ({
    url: `${base}${p || '/'}`,
    lastModified: now,
    changeFrequency: p === '' ? 'weekly' : 'monthly',
    priority: p === '' ? 1 : 0.8,
  }))
}
