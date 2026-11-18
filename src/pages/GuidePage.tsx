import { Link, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Lightbulb, Undo2, Target, BookOpen } from 'lucide-react'
import { guideById, guidesForPath, pathById } from '@/content'
import { Markup } from '@/lib/markup'
import { CodeBlock } from '@/components/CodeBlock'
import { SandboxDemo } from '@/components/sim/SandboxDemo'
import { Badge, levelColor } from '@/components/ui/misc'
import { Button } from '@/components/ui/button'
import { useProgress } from '@/lib/progress'
import NotFound from './NotFound'

function Section({ icon: Icon, title, color, children, id }: { icon: typeof Target; title: string; color?: string; children: React.ReactNode; id?: string }) {
  return (
    <motion.section id={id} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-10 scroll-mt-24">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Icon className="h-5 w-5" style={{ color }} /> {title}
      </h2>
      <div className="mt-3">{children}</div>
    </motion.section>
  )
}

function Bullets({ items, dot }: { items: string[]; dot: string }) {
  return (
    <ul className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className="flex gap-3 leading-7 text-foreground/90">
          <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dot }} />
          <span>
            <Markup text={t} />
          </span>
        </li>
      ))}
    </ul>
  )
}

export default function GuidePage() {
  const { id = '' } = useParams()
  const g = guideById[id]
  const { guides: done, markGuide } = useProgress()
  if (!g) return <NotFound />
  const path = pathById[g.path]
  const list = guidesForPath(g.path)
  const idx = list.findIndex((x) => x.id === g.id)
  const prev = list[idx - 1]
  const next = list[idx + 1]
  const isDone = done.includes(g.id)

  return (
    <div className="container grid gap-10 py-10 lg:grid-cols-[1fr_260px]">
      <article className="min-w-0">
        <Link to={`/learn/${g.path}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {path.title}
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge color={path.color}>{path.title}</Badge>
          <Badge color={levelColor[g.level]}>{g.level}</Badge>
          <span className="text-xs text-muted-foreground">
            Guide {idx + 1} of {list.length}
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{g.title}</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          <Markup text={g.summary} />
        </p>

        <Section icon={Target} title="When to use this" color={path.color} id="when">
          <Bullets items={g.whenToUse} dot={path.color} />
        </Section>

        {g.explain && (
          <Section icon={BookOpen} title="How it works" color="#a78bfa" id="how">
            <div className="prose-gc space-y-3">
              {g.explain.map((p, i) => (
                <p key={i}>
                  <Markup text={p} />
                </p>
              ))}
            </div>
          </Section>
        )}

        {g.sandbox && (
          <Section icon={Target} title="See it in action" color="#22d3ee" id="demo">
            <SandboxDemo key={g.id} setup={g.sandbox.setup} commands={g.sandbox.commands} />
          </Section>
        )}

        <Section icon={CheckCircle2} title="Step by step" color="#34d399" id="steps">
          <ol className="space-y-5">
            {g.steps.map((s, i) => (
              <li key={i} className="flex gap-4">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border bg-secondary font-mono text-xs font-semibold">{i + 1}</span>
                <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                  <p className="leading-7">
                    <Markup text={s.text} />
                  </p>
                  {s.code && <CodeBlock code={s.code} lang={/^\s*(name|on|jobs|steps|permissions|-\s+uses|uses|runs-on|version|updates):/m.test(s.code) ? 'yaml' : 'bash'} />}
                  {s.note && (
                    <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-200/90">
                      <Markup text={s.note} />
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Section>

        {g.risks && (
          <Section icon={AlertTriangle} title="What can go wrong" color="#f87171" id="risks">
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
              <Bullets items={g.risks} dot="#f87171" />
            </div>
          </Section>
        )}
        {g.undo && (
          <Section icon={Undo2} title="How to undo it" color="#fbbf24" id="undo">
            <Bullets items={g.undo} dot="#fbbf24" />
          </Section>
        )}
        {g.tips && (
          <Section icon={Lightbulb} title="Pro tips" color="#22d3ee" id="tips">
            <Bullets items={g.tips} dot="#22d3ee" />
          </Section>
        )}

        <div className="mt-12 flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-5">
          <div className="flex-1">
            <p className="font-medium">{isDone ? 'Nice, you finished this guide.' : 'Got it?'}</p>
            <p className="text-sm text-muted-foreground">Mark it as done to track your progress (+10 XP).</p>
          </div>
          <Button variant={isDone ? 'secondary' : 'gradient'} onClick={() => markGuide(g.id, !isDone)}>
            <CheckCircle2 className="h-4 w-4" /> {isDone ? 'Done ✓' : 'Mark as done'}
          </Button>
        </div>

        <nav className="mt-6 grid gap-3 sm:grid-cols-2">
          {prev ? (
            <Link to={`/guide/${prev.id}`} className="rounded-xl border p-4 transition hover:border-primary/50">
              <span className="text-xs text-muted-foreground">← Previous</span>
              <p className="font-medium">{prev.title}</p>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link to={`/guide/${next.id}`} className="rounded-xl border p-4 text-right transition hover:border-primary/50">
              <span className="text-xs text-muted-foreground">Next →</span>
              <p className="font-medium">{next.title}</p>
            </Link>
          )}
        </nav>
      </article>

      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">On this page</p>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                ['when', 'When to use'],
                g.explain && ['how', 'How it works'],
                g.sandbox && ['demo', 'Animated demo'],
                ['steps', 'Step by step'],
                g.risks && ['risks', 'What can go wrong'],
                g.undo && ['undo', 'How to undo'],
                g.tips && ['tips', 'Pro tips'],
              ]
                .filter(Boolean)
                .map((x) => {
                  const [a, label] = x as string[]
                  return (
                    <li key={a}>
                      <a href={`#${a}`} className="text-muted-foreground hover:text-foreground">
                        {label}
                      </a>
                    </li>
                  )
                })}
            </ul>
          </div>
          {g.related && g.related.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Related</p>
              <ul className="mt-3 space-y-2 text-sm">
                {g.related.map((r) => guideById[r]).filter(Boolean).map((r) => (
                  <li key={r.id}>
                    <Link to={`/guide/${r.id}`} className="group flex items-center gap-1 text-muted-foreground hover:text-primary">
                      <ArrowRight className="h-3 w-3 shrink-0 transition group-hover:translate-x-0.5" /> {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>
      {g.related && g.related.length > 0 && (
        <div className="lg:hidden">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Related guides</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {g.related.map((r) => guideById[r]).filter(Boolean).map((r) => (
              <Link key={r.id} to={`/guide/${r.id}`} className="rounded-full border px-3 py-1 text-xs hover:border-primary">
                {r.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
