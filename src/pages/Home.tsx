import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, Gamepad2, Search, Settings, SquareTerminal, Workflow, Sparkles, ScrollText, BookMarked } from 'lucide-react'
import { guidesForPath, paths, guideById } from '@/content'
import { iconFor } from '@/lib/icons'
import { useSearch } from '@/components/SearchPalette'
import { AutoDemo } from '@/components/sim/SandboxDemo'
import { useProgress } from '@/lib/progress'
import { buttonClass } from '@/components/ui/button'
import { Kbd } from '@/components/ui/misc'

const RESCUES = ['undo-last-commit', 'resolve-merge-conflicts', 'remove-secrets-from-history', 'recover-with-reflog', 'force-push-safely', 'discard-local-changes', 'detached-head', 'squash-commits']

const fadeUp = { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' } }

export default function Home() {
  const { open } = useSearch()
  const { guides: done } = useProgress()

  return (
    <>
      {/* HERO */}
      <section className="relative">
        <div className="bg-grid absolute inset-0" />
        <div className="container relative grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Learn by doing: a real git simulator in your browser
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Find your way in <span className="text-gradient">Git, GitHub</span> & CI/CD
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Start from zero or jump straight to the fix you need. Every guide shows the exact commands, what can go wrong, and an animated replay of what Git does to your history.
            </p>
            <button
              onClick={() => open()}
              data-tour="hero-search"
              className="glow mt-8 flex w-full max-w-xl items-center gap-3 rounded-2xl border bg-card/80 px-5 py-4 text-left text-muted-foreground backdrop-blur transition hover:border-primary/60"
            >
              <Search className="h-5 w-5 text-primary" />
              <span className="flex-1">Try “rewrite git history” or “undo commit”…</span>
              <span className="hidden gap-1 sm:flex">
                <Kbd>Ctrl</Kbd>
                <Kbd>K</Kbd>
              </span>
            </button>
            <div className="mt-4 flex flex-wrap gap-2">
              {['undo last commit', 'merge conflict', 'remove secret from history', 'github environments'].map((s) => (
                <button key={s} onClick={() => open(s)} className="rounded-full border bg-card/50 px-3 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary">
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#start" className={buttonClass('gradient', 'lg')}>
                Choose where to start <ArrowRight className="h-4 w-4" />
              </a>
              <Link to="/playground" className={buttonClass('outline', 'lg')}>
                <SquareTerminal className="h-4 w-4" /> Open playground
              </Link>
            </div>
          </div>
          <motion.div initial={{ opacity: 0, rotateY: -14, rotateX: 6 }} animate={{ opacity: 1, rotateY: -3, rotateX: 2 }} transition={{ duration: 1 }} style={{ perspective: 1200, transformStyle: 'preserve-3d' }} className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-[linear-gradient(135deg,hsl(var(--primary)/.25),hsl(var(--accent)/.25))] blur-2xl" />
            <div className="relative rounded-2xl border bg-card/70 p-3 shadow-2xl backdrop-blur" data-tour="hero-demo">
              <AutoDemo />
            </div>
          </motion.div>
        </div>
      </section>

      {/* PATHS */}
      <section id="start" className="container scroll-mt-20 py-16" data-tour="paths">
        <motion.div {...fadeUp}>
          <h2 className="text-3xl font-bold tracking-tight">Where do you want to start?</h2>
          <p className="mt-2 text-muted-foreground">Pick the path that matches you. Each one goes from easy to advanced, and you can jump anywhere.</p>
        </motion.div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paths.map((p, i) => {
            const list = guidesForPath(p.id)
            const read = list.filter((g) => done.includes(g.id)).length
            const Icon = iconFor(p.icon)
            return (
              <motion.div key={p.id} {...fadeUp} transition={{ delay: i * 0.05 }}>
                <Link to={`/learn/${p.id}`} className="card-3d group relative block h-full overflow-hidden rounded-2xl border bg-card p-6">
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40" style={{ background: p.color }} />
                  <span className="grid h-11 w-11 place-items-center rounded-xl border" style={{ color: p.color, borderColor: `${p.color}55`, background: `${p.color}15` }}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="mt-4 text-xs font-medium uppercase tracking-wider" style={{ color: p.color }}>
                    {p.forWho}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">{p.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{p.tagline}</p>
                  <div className="mt-5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{list.length} guides</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(read / list.length) * 100}%`, background: p.color }} />
                    </div>
                    <span>{read}/{list.length}</span>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* RESCUE */}
      <section className="container py-10">
        <motion.div {...fadeUp} className="rounded-3xl border bg-[linear-gradient(135deg,hsl(0_80%_60%/.08),transparent_60%)] p-6 sm:p-10">
          <h2 className="text-2xl font-bold tracking-tight">Something went wrong? 🛟</h2>
          <p className="mt-1 text-muted-foreground">The most searched fixes, one click away.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {RESCUES.map((id) => guideById[id]).filter(Boolean).map((g) => (
              <Link key={g.id} to={`/guide/${g.id}`} className="group rounded-xl border bg-card/70 p-4 transition hover:border-rose-400/60">
                <p className="font-medium group-hover:text-rose-300">{g.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{g.summary.replace(/`/g, '')}</p>
              </Link>
            ))}
          </div>
        </motion.div>
      </section>

      {/* FEATURES */}
      <section className="container py-16">
        <motion.h2 {...fadeUp} className="text-3xl font-bold tracking-tight">
          More than docs
        </motion.h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            { to: '/playground', icon: SquareTerminal, color: '#22d3ee', title: 'Playground', text: 'A full git sandbox: type real commands and watch the commit graph, staging area and GitHub remote change live. Nothing can break.' },
            { to: '/challenges', icon: Gamepad2, color: '#f472b6', title: 'Challenges', text: '16 game levels from “first commit” to “scrub a leaked API key”. Earn XP, rank up, and learn by fixing real situations.' },
            { to: '/github', icon: Settings, color: '#fbbf24', title: 'GitHub settings tour', text: 'Rulesets, Environments, Deploy keys, Secrets… every repository setting explained: what it is, when to use it, best practices.' },
            { to: '/cicd', icon: Workflow, color: '#a78bfa', title: 'CI/CD lab', text: 'What a pipeline is, an animated run of a GitHub Actions workflow, and real workflow files explained line by line.' },
            { to: '/changelog', icon: ScrollText, color: '#34d399', title: 'Changelog & PR writer', text: 'Paste your commits and get a tidy CHANGELOG section, a pull request description or release notes, grouped into features and fixes, with a suggested version.' },
            { to: '/commands', icon: BookMarked, color: '#60a5fa', title: 'Command reference', text: 'Every git command you will actually use, with the flags that matter, examples, and a warning on the ones that can destroy work.' },
          ].map((f, i) => (
            <motion.div key={f.to} {...fadeUp} transition={{ delay: i * 0.06 }}>
              <Link to={f.to} className="card-3d group flex h-full gap-4 rounded-2xl border bg-card p-6">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border" style={{ color: f.color, borderColor: `${f.color}55`, background: `${f.color}15` }}>
                  <f.icon className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    {f.title} <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  )
}
