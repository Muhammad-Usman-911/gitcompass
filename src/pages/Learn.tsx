import { Link, useParams, Navigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { CheckCircle2, Circle, PlayCircle } from 'lucide-react'
import { guidesForPath, pathById, paths } from '@/content'
import type { PathId } from '@/content/types'
import { iconFor } from '@/lib/icons'
import { useProgress } from '@/lib/progress'
import { Badge, levelColor } from '@/components/ui/misc'
import { Markup } from '@/lib/markup'
import { cn } from '@/lib/utils'

export default function Learn() {
  const { path } = useParams()
  const { guides: done } = useProgress()
  if (path && !(path in pathById)) return <Navigate to="/learn" replace />
  const active = (path as PathId) ?? null

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold tracking-tight">Learning paths</h1>
      <p className="mt-2 text-muted-foreground">Pick a path. Guides are ordered from first steps to advanced, and every guide works on its own.</p>
      <div className="scrollbar-thin -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2" data-tour="path-tabs">
        <Link to="/learn" className={cn('shrink-0 rounded-full border px-4 py-1.5 text-sm', !active ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}>
          All
        </Link>
        {paths.map((p) => (
          <Link
            key={p.id}
            to={`/learn/${p.id}`}
            className={cn('shrink-0 rounded-full border px-4 py-1.5 text-sm transition', active === p.id ? '' : 'text-muted-foreground hover:text-foreground')}
            style={active === p.id ? { color: p.color, borderColor: p.color, background: `${p.color}18` } : undefined}
          >
            {p.title}
          </Link>
        ))}
      </div>
      <div className="mt-8 space-y-14">
        {(active ? paths.filter((p) => p.id === active) : paths).map((p) => {
          const list = guidesForPath(p.id)
          const Icon = iconFor(p.icon)
          return (
            <section key={p.id}>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl border" style={{ color: p.color, borderColor: `${p.color}55`, background: `${p.color}15` }}>
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold">{p.title}</h2>
                  <p className="text-sm text-muted-foreground">{p.tagline}</p>
                </div>
              </div>
              <ol className="relative mt-6 space-y-3 border-l-2 pl-6" style={{ borderColor: `${p.color}40` }}>
                {list.map((g, i) => {
                  const isDone = done.includes(g.id)
                  return (
                    <motion.li key={g.id} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(i * 0.03, 0.3) }} className="relative">
                      <span className="absolute -left-[34px] top-4 grid h-5 w-5 place-items-center rounded-full bg-background">
                        {isDone ? <CheckCircle2 className="h-5 w-5" style={{ color: p.color }} /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                      </span>
                      <Link to={`/guide/${g.id}`} className="group flex flex-col gap-1 rounded-xl border bg-card p-4 transition hover:border-primary/50 sm:flex-row sm:items-center sm:gap-4">
                        <span className="w-6 shrink-0 font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium group-hover:text-primary">{g.title}</p>
                          <p className="text-sm text-muted-foreground">
                            <Markup text={g.summary} />
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {g.sandbox && (
                            <Badge className="border-cyan-500/40 text-cyan-400">
                              <PlayCircle className="h-3 w-3" /> demo
                            </Badge>
                          )}
                          <Badge color={levelColor[g.level]}>{g.level}</Badge>
                        </div>
                      </Link>
                    </motion.li>
                  )
                })}
              </ol>
            </section>
          )
        })}
      </div>
    </div>
  )
}
