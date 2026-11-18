import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AlertTriangle, BookOpen, Search } from 'lucide-react'
import Fuse from 'fuse.js'
import { commands, guideById } from '@/content'
import type { CommandRef } from '@/content/types'
import { Markup } from '@/lib/markup'
import { CodeBlock } from '@/components/CodeBlock'
import { cn } from '@/lib/utils'

const CATS: CommandRef['category'][] = ['Setup', 'Snapshot', 'Branching', 'Remote', 'Inspect', 'Undo', 'Rewrite', 'Advanced']

export default function Commands() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string | null>(null)
  const { hash } = useLocation()
  const fuse = useMemo(() => new Fuse(commands, { threshold: 0.35, ignoreLocation: true, keys: ['name', 'summary', 'keywords', 'flags.flag', 'syntax'] }), [])
  const list = (q ? fuse.search(q).map((r) => r.item) : commands).filter((c) => !cat || c.category === cat)

  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(decodeURIComponent(hash.slice(1)))
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      el.classList.add('ring-2', 'ring-primary')
      const t = setTimeout(() => el.classList.remove('ring-2', 'ring-primary'), 2000)
      return () => clearTimeout(t)
    }
  }, [hash])

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold tracking-tight">Command reference</h1>
      <p className="mt-1 text-muted-foreground">{commands.length} commands with the flags you actually use. Red ones can destroy work: read the guide first.</p>
      <div className="sticky top-16 z-20 -mx-4 mt-6 space-y-3 bg-background/85 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2 rounded-xl border bg-card px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter commands or flags… e.g. “--amend”, “stash”, “delete branch”" className="h-11 w-full bg-transparent text-sm outline-none" aria-label="Filter commands" />
        </div>
        <div className="scrollbar-thin flex gap-2 overflow-x-auto">
          <button onClick={() => setCat(null)} className={cn('shrink-0 rounded-full border px-3 py-1 text-xs', !cat ? 'border-primary text-primary' : 'text-muted-foreground')}>
            All
          </button>
          {CATS.map((c) => (
            <button key={c} onClick={() => setCat(c === cat ? null : c)} className={cn('shrink-0 rounded-full border px-3 py-1 text-xs', cat === c ? 'border-primary text-primary' : 'text-muted-foreground')}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {list.map((c) => {
          const g = c.guide ? guideById[c.guide] : undefined
          return (
            <article key={c.name} id={c.name} className={cn('scroll-mt-48 rounded-2xl border bg-card p-5 transition', c.danger && 'border-rose-500/30')}>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-mono text-lg font-semibold text-primary">{c.name}</h2>
                <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">{c.category}</span>
                {c.danger && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[11px] text-rose-300">
                    <AlertTriangle className="h-3 w-3" /> careful
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-foreground/90">
                <Markup text={c.summary} />
              </p>
              <p className="mt-3 rounded-md bg-secondary/60 px-3 py-1.5 font-mono text-xs">{c.syntax}</p>
              {c.flags.length > 0 && (
                <table className="mt-3 w-full text-sm">
                  <tbody>
                    {c.flags.map((f) => (
                      <tr key={f.flag} className="border-t">
                        <td className="whitespace-nowrap py-1.5 pr-3 align-top font-mono text-xs text-violet-300">{f.flag}</td>
                        <td className="py-1.5 text-muted-foreground">
                          <Markup text={f.desc} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="mt-3 space-y-2">
                {c.examples.map((e, i) => (
                  <div key={i}>
                    <p className="mb-1 text-xs text-muted-foreground">
                      <Markup text={e.desc} />
                    </p>
                    <CodeBlock code={e.code} />
                  </div>
                ))}
              </div>
              {g && (
                <Link to={`/guide/${g.id}`} className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <BookOpen className="h-4 w-4" /> Guide: {g.title}
                </Link>
              )}
            </article>
          )
        })}
        {!list.length && <p className="text-muted-foreground">No command matches “{q}”. Try the global search (Ctrl K).</p>}
      </div>
    </div>
  )
}
