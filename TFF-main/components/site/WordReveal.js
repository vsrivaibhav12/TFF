'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * WordReveal — animates the children's text words in with a gentle stagger.
 * Wrap a heading or sentence with this. Honors prefers-reduced-motion.
 *
 * Usage:
 *   <WordReveal as="h1" className="...">
 *     Are your decisions based on{' '}<span className="text-[#0D9488]">structured data</span>{' '}or assumptions?
 *   </WordReveal>
 *
 * Tip: keep grouped phrases (like a colored span) inside a single <span> child;
 * each top-level child is animated as one "word" unit, so JSX <span>s remain intact.
 */
export default function WordReveal({ as: Tag = 'span', className = '', children, delay = 0, stagger = 50 }) {
  const ref = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setReady(true)
      return
    }
    const node = ref.current
    if (!node) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setReady(true)
        obs.disconnect()
      }
    }, { threshold: 0.2 })
    obs.observe(node)
    return () => obs.disconnect()
  }, [])

  // Split children into word-level units. Strings get split on whitespace, JSX nodes pass through as one unit.
  const flatten = (node) => {
    if (typeof node === 'string') {
      return node.split(/(\s+)/).map(s => ({ kind: 'word', value: s }))
    }
    if (Array.isArray(node)) {
      return node.flatMap(flatten)
    }
    return [{ kind: 'jsx', value: node }]
  }
  const units = flatten(children)

  let wordIndex = 0
  return (
    <Tag ref={ref} className={`word-reveal ${ready ? 'is-ready' : ''} ${className}`} style={{ '--reveal-delay': `${delay}ms` }}>
      {units.map((u, i) => {
        if (u.kind === 'word' && /^\s+$/.test(u.value)) {
          return <span key={i}>{u.value}</span>
        }
        const idx = wordIndex++
        return (
          <span
            key={i}
            className="word-reveal-token"
            style={{ transitionDelay: `${delay + idx * stagger}ms` }}
          >
            {u.value}
          </span>
        )
      })}
    </Tag>
  )
}
