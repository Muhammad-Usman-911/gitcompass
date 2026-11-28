import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Circle, Eye, Lightbulb, RotateCcw, Star, Trophy } from 'lucide-react'
import { challenges, goalStatus } from '@/sim/challenges'
import { useSim } from '@/hooks/useSim'
import { Terminal } from '@/components/sim/Terminal'
import { CommitGraph } from '@/components/sim/CommitGraph'
import { RepoPanel } from '@/components/sim/RepoPanel'
import { Button, buttonClass } from '@/components/ui/button'
import { Markup } from '@/lib/markup'
import { useProgress } from '@/lib/progress'
import { cn } from '@/lib/utils'
import { guideById } from '@/content'
import NotFound from './NotFound'

function Confetti() {
  const bits = useMemo(() => Array.from({ length: 40 }, (_, i) => ({ i, x: Math.random() * 100, d: Math.random() * 0.6, r: Math.random() * 360, c: ['#22d3ee', '#a78bfa', '#f472b6', '#fbbf24', '#34d399'][i % 5] })), [])
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((b) => (
        <motion.span
          key={b.i}
          className="absolute top-0 h-2.5 w-1.5 rounded-sm"
          style={{ left: `${b.x}%`, background: b.c }}
          initial={{ y: -20, rotate: 0, opacity: 1 }}
          animate={{ y: 420, rotate: b.r * 3, opacity: 0 }}
          transition={{ duration: 1.8, delay: b.d, ease: 'easeIn' }}
        />
      ))}
    </div>
  )
}

export default function ChallengePage() {
  const { id } = useParams()
  const c = challenges.find((x) => x.id === id)
  if (!c) return <NotFound />
  return <ChallengeRunner key={c.id} id={c.id} />
}

function ChallengeRunner({ id }: { id: string }) {
  const idx = challenges.findIndex((x) => x.id === id)
  const c = challenges[idx]
  const next = challenges[idx + 1]
  const navigate = useNavigate()
  const intro = useMemo(() => [{ kind: 'info' as const, text: `Level: ${c.title}. Read the mission, then type commands below. Type \`help\` anytime.` }], [c.title])
  const sim = useSim(c.setup, intro)
  const [hints, setHints] = useState(0)
  const [showSolution, setShowSolution] = useState(false)
  const [won, setWon] = useState<null | { xp: number; first: boolean }>(null)
  const [celebrated, setCelebrated] = useState(false)
  const { completeChallenge, challenges: done } = useProgress()

  const status = goalStatus(c, sim.state)
  const solved = status.every(Boolean)

  useEffect(() => {
    if (solved && !celebrated && sim.history.length > 0) {
      setCelebrated(true)
      const first = completeChallenge(c.id, c.xp)
      setWon({ xp: c.xp, first })
    }
  }, [solved, celebrated, sim.history.length, completeChallenge, c.id, c.xp])

  const guide = c.guide ? guideById[c.guide] : undefined

  return (
    <div className="container py-8">
      <Link to="/challenges" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All challenges
      </Link>
      <div className="mt-4 grid gap-4 xl:grid-cols-[340px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{c.world}</span>·
              <span className="flex gap-0.5">
                {[1, 2, 3].map((n) => (
                  <Star key={n} className={cn('h-3 w-3', n <= c.difficulty ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
                ))}
              </span>
              <span className="ml-auto font-semibold text-pink-400">+{c.xp} XP</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold">{c.title}</h1>
            <p className="mt-2 text-sm leading-6 text-foreground/90">
              <Markup text={c.story} />
            </p>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Goals</p>
            <ul className="mt-2 space-y-2" data-tour="goals">
              {c.goals.map((g, i) => (
                <motion.li key={i} layout className={cn('flex items-start gap-2 text-sm transition', status[i] ? 'text-emerald-400' : 'text-foreground/90')}>
                  <motion.span animate={status[i] ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.35 }} className="mt-0.5 shrink-0">
                    {status[i] ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                  </motion.span>
                  {g.text}
                </motion.li>
              ))}
            </ul>
            {done.includes(c.id) && !won && <p className="mt-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">You already solved this level. Play again anytime.</p>}
          </div>

          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-semibold">Hints</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {hints}/{c.hints.length}
              </span>
            </div>
            <ol className="mt-3 space-y-2 text-sm">
              <AnimatePresence>
                {c.hints.slice(0, hints).map((h, i) => (
                  <motion.li key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                    <Markup text={h} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
            <div className="mt-3 flex flex-wrap gap-2">
              {hints < c.hints.length && (
                <Button size="sm" variant="outline" onClick={() => setHints((h) => h + 1)}>
                  <Lightbulb className="h-3.5 w-3.5" /> {hints ? 'Another hint' : 'Get a hint'}
                </Button>
              )}
              {hints >= c.hints.length && !showSolution && (
                <Button size="sm" variant="ghost" onClick={() => setShowSolution(true)}>
                  <Eye className="h-3.5 w-3.5" /> Show solution
                </Button>
              )}
            </div>
            {showSolution && (
              <pre className="mt-3 overflow-x-auto rounded-lg bg-term p-3 font-mono text-xs text-slate-200">
                {c.solution.map((s) => (s === '__REFLOG_INVOICES__' ? 'git reflog\ngit reset --hard <id of "commit: Add invoices">' : s)).join('\n')}
              </pre>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { sim.reset(c.setup); setWon(null); setCelebrated(false) }}>
              <RotateCcw className="h-4 w-4" /> Restart level
            </Button>
            {guide && (
              <Link to={`/guide/${guide.id}`} className={buttonClass('outline', 'md', 'flex-1')}>
                <BookOpen className="h-4 w-4" /> Guide
              </Link>
            )}
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Terminal sim={sim} className="h-[24rem]" />
            <div className="relative min-w-0 rounded-xl border bg-card/60 p-2">
              <CommitGraph state={sim.state} className="min-h-[22rem]" />
            </div>
          </div>
          <RepoPanel state={sim.state} />
        </div>
      </div>

      <AnimatePresence>
        {won && (
          <motion.div className="fixed inset-0 z-[90] grid place-items-center bg-background/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="glow relative w-full max-w-md overflow-hidden rounded-3xl border bg-card p-8 text-center">
              <Confetti />
              <motion.div initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ delay: 0.15, type: 'spring' }} className="mx-auto grid h-20 w-20 place-items-center rounded-2xl border border-amber-400/40 bg-amber-400/10">
                <Trophy className="h-10 w-10 text-amber-400" />
              </motion.div>
              <h2 className="mt-5 text-2xl font-bold">Level complete!</h2>
              <p className="mt-1 text-muted-foreground">{c.title}</p>
              <p className="mt-4 text-3xl font-extrabold text-gradient">{won.first ? `+${won.xp} XP` : 'Solved again'}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={() => setWon(null)}>Keep exploring</Button>
                {next ? (
                  <Button variant="gradient" onClick={() => navigate(`/challenges/${next.id}`)}>
                    Next: {next.title} <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="gradient" onClick={() => navigate('/challenges')}>All challenges</Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
