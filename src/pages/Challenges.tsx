import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { CheckCircle2, Circle, Star, Trophy } from 'lucide-react'
import { challenges, worlds } from '@/sim/challenges'
import { useProgress, rankFor } from '@/lib/progress'
import { cn } from '@/lib/utils'

const worldColor: Record<string, string> = { Basics: '#34d399', Branches: '#60a5fa', Undo: '#fbbf24', Teamwork: '#a78bfa', Rewrite: '#f472b6' }

export default function Challenges() {
  const { challenges: done, xp } = useProgress()
  const rank = rankFor(xp)
  const total = challenges.reduce((a, c) => a + c.xp, 0)

  return (
    <div className="container py-10">
      <div className="relative overflow-hidden rounded-3xl border bg-card p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-pink-500/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-6">
          <span className="grid h-16 w-16 place-items-center rounded-2xl border border-amber-400/40 bg-amber-400/10">
            <Trophy className="h-8 w-8 text-amber-400" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Challenges</h1>
            <p className="mt-1 text-muted-foreground">Real situations, real commands. Solve a level to earn XP. Start anywhere: nothing is locked.</p>
          </div>
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-sm">
              <span className="font-semibold">{rank.name}</span>
              <span className="text-muted-foreground">{xp} / {total} XP</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
              <motion.div className="h-full rounded-full bg-[linear-gradient(90deg,#fbbf24,#f472b6)]" initial={{ width: 0 }} animate={{ width: `${rank.pct * 100}%` }} />
            </div>
            {rank.next && <p className="mt-1 text-xs text-muted-foreground">{rank.toNext} XP to {rank.next}</p>}
          </div>
        </div>
      </div>

      <div className="mt-10 space-y-10">
        {worlds.map((w, wi) => {
          const list = challenges.filter((c) => c.world === w)
          const color = worldColor[w]
          return (
            <section key={w}>
              <h2 className="flex items-center gap-3 text-lg font-semibold">
                <span className="grid h-8 w-8 place-items-center rounded-lg font-mono text-sm" style={{ background: `${color}22`, color }}>
                  {wi + 1}
                </span>
                World {wi + 1}: {w}
                <span className="text-sm font-normal text-muted-foreground">
                  {list.filter((c) => done.includes(c.id)).length}/{list.length}
                </span>
              </h2>
              <div className="relative mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {list.map((c, i) => {
                  const isDone = done.includes(c.id)
                  return (
                    <motion.div key={c.id} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                      <Link
                        to={`/challenges/${c.id}`}
                        className={cn('card-3d group relative flex h-full flex-col rounded-2xl border bg-card p-5', isDone && 'border-emerald-500/40')}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-muted-foreground">
                            {wi + 1}-{i + 1}
                          </span>
                          {isDone ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <Circle className="h-4 w-4 text-muted-foreground/40" />}
                        </div>
                        <h3 className="mt-3 font-semibold group-hover:text-primary">{c.title}</h3>
                        <p className="mt-1 line-clamp-3 flex-1 text-sm text-muted-foreground">{c.story}</p>
                        <div className="mt-4 flex items-center justify-between text-xs">
                          <span className="flex gap-0.5">
                            {[1, 2, 3].map((n) => (
                              <Star key={n} className={cn('h-3.5 w-3.5', n <= c.difficulty ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
                            ))}
                          </span>
                          <span className="font-semibold" style={{ color }}>
                            +{c.xp} XP
                          </span>
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
