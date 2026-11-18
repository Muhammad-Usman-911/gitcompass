import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, MapPin, Sparkles, Target } from 'lucide-react'
import { settingsItems, guideById, guidesForPath } from '@/content'
import type { SettingsGroup } from '@/content/types'
import { iconFor } from '@/lib/icons'
import { Markup } from '@/lib/markup'
import { CodeBlock } from '@/components/CodeBlock'
import { cn } from '@/lib/utils'

const GROUPS: SettingsGroup[] = ['General', 'Access', 'Code, planning, and automation', 'Security and quality', 'Integrations']

function List({ items, color }: { items: string[]; color: string }) {
  return (
    <ul className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-6 text-foreground/90">
          <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
          <span>
            <Markup text={t} />
          </span>
        </li>
      ))}
    </ul>
  )
}

export default function GitHubTour() {
  const { id } = useParams()
  const navigate = useNavigate()
  const current = settingsItems.find((s) => s.id === id) ?? settingsItems[0]
  const idx = settingsItems.indexOf(current)
  const next = settingsItems[idx + 1]
  const Icon = iconFor(current.icon)

  return (
    <div className="container py-10">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GitHub settings tour</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Every page in a repository's <strong className="text-foreground">Settings</strong> tab, explained: what it does, when you need it, and how to set it up safely. Click any item.
          </p>
        </div>
      </div>

      {/* mobile picker */}
      <select
        className="mt-6 w-full rounded-lg border bg-card px-3 py-2.5 text-sm lg:hidden"
        value={current.id}
        onChange={(e) => navigate(`/github/${e.target.value}`)}
        aria-label="Choose a settings page"
      >
        {GROUPS.map((g) => (
          <optgroup key={g} label={g}>
            {settingsItems
              .filter((s) => s.group === g)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
          </optgroup>
        ))}
      </select>

      <div className="mt-6 grid gap-6 lg:grid-cols-[270px_1fr]">
        {/* sidebar replica */}
        <nav className="hidden self-start rounded-2xl border bg-card p-3 lg:sticky lg:top-24 lg:block" data-tour="settings-nav" aria-label="Settings pages">
          {GROUPS.map((g, gi) => (
            <div key={g} className={cn(gi > 0 && 'mt-3 border-t pt-3')}>
              {g !== 'General' && <p className="px-3 pb-1 text-xs font-semibold text-muted-foreground">{g}</p>}
              {settingsItems
                .filter((s) => s.group === g)
                .map((s) => {
                  const I = iconFor(s.icon)
                  const active = s.id === current.id
                  return (
                    <Link
                      key={s.id}
                      to={`/github/${s.id}`}
                      className={cn('relative flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition', active ? 'bg-secondary font-semibold text-foreground' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground')}
                    >
                      {active && <motion.span layoutId="settings-active" className="absolute -left-3 top-1 h-[calc(100%-8px)] w-1 rounded-full bg-primary" />}
                      <I className="h-4 w-4" />
                      {s.label}
                    </Link>
                  )
                })}
            </div>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          <motion.article key={current.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} className="min-w-0">
            <div className="relative overflow-hidden rounded-2xl border bg-card p-6">
              <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-amber-400/40 bg-amber-400/10 text-amber-400">
                  <Icon className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-amber-400">{current.group}</p>
                  <h2 className="text-2xl font-bold">{current.label}</h2>
                  <p className="mt-1 text-muted-foreground">
                    <Markup text={current.summary} />
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-md border bg-secondary/50 px-2 py-1 font-mono text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {current.location}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border bg-card p-5">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Sparkles className="h-4 w-4 text-violet-400" /> What it is
                </h3>
                <div className="mt-3 space-y-2 text-sm leading-6 text-foreground/90">
                  {current.whatItIs.map((p, i) => (
                    <p key={i}>
                      <Markup text={p} />
                    </p>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border bg-card p-5">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Target className="h-4 w-4 text-cyan-400" /> When to use it
                </h3>
                <div className="mt-3">
                  <List items={current.whenToUse} color="#22d3ee" />
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border bg-card p-5">
              <h3 className="flex items-center gap-2 font-semibold">
                <ChevronRight className="h-4 w-4 text-emerald-400" /> How to set it up
              </h3>
              <ol className="mt-4 space-y-4">
                {current.howTo.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border bg-secondary font-mono text-[11px] font-semibold">{i + 1}</span>
                    <div className="min-w-0 flex-1 space-y-2 text-sm leading-6">
                      <p>
                        <Markup text={s.text} />
                      </p>
                      {s.code && <CodeBlock code={s.code} lang={/^\s*[\w-]+:/m.test(s.code) && !/^\s*(git|gh|ssh|cat|echo)\b/m.test(s.code) ? 'yaml' : 'bash'} />}
                      {s.note && (
                        <p className="text-xs text-amber-300/90">
                          <Markup text={s.note} />
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[.04] p-5">
                <h3 className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Best practices
                </h3>
                <div className="mt-3">
                  <List items={current.bestPractices} color="#34d399" />
                </div>
              </div>
              {current.pitfalls && (
                <div className="rounded-2xl border border-rose-500/25 bg-rose-500/[.04] p-5">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4 text-rose-400" /> Pitfalls
                  </h3>
                  <div className="mt-3">
                    <List items={current.pitfalls} color="#f87171" />
                  </div>
                </div>
              )}
            </div>

            {current.relatedGuides && current.relatedGuides.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {current.relatedGuides.map((r) => guideById[r]).filter(Boolean).map((g) => (
                  <Link key={g.id} to={`/guide/${g.id}`} className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary">
                    📖 {g.title}
                  </Link>
                ))}
              </div>
            )}

            {next && (
              <Link to={`/github/${next.id}`} className="group mt-6 flex items-center justify-between rounded-2xl border bg-card p-5 transition hover:border-primary/50">
                <span>
                  <span className="text-xs text-muted-foreground">Next setting</span>
                  <span className="block font-semibold">{next.label}</span>
                </span>
                <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
              </Link>
            )}
          </motion.article>
        </AnimatePresence>
      </div>

      <section className="mt-16">
        <h2 className="text-xl font-semibold">GitHub workflows (guides)</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {guidesForPath('github').map((g) => (
            <Link key={g.id} to={`/guide/${g.id}`} className="rounded-xl border bg-card p-4 transition hover:border-amber-400/50">
              <p className="font-medium">{g.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{g.summary.replace(/`/g, '')}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
