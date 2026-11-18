import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Bug, CheckCircle2, CircleDashed, GitCommitHorizontal, Loader2, Play, Rocket, ShieldCheck, XCircle, Zap, Globe } from 'lucide-react'
import { guidesForPath, workflows } from '@/content'
import { Markup } from '@/lib/markup'
import { YamlLine } from '@/components/CodeBlock'
import { Button } from '@/components/ui/button'
import { Badge, levelColor } from '@/components/ui/misc'
import { cn } from '@/lib/utils'

type St = 'idle' | 'running' | 'ok' | 'fail' | 'waiting' | 'skipped'
interface Stage {
  id: string
  label: string
  sub: string
  icon: typeof Zap
  logs: string[]
}
const STAGES: Stage[] = [
  { id: 'push', label: 'git push', sub: 'event: push to main', icon: GitCommitHorizontal, logs: ['$ git push origin main', 'To github.com:you/shop.git', '   a1b2c3d..e4f5a6b  main -> main'] },
  { id: 'trigger', label: 'Workflow triggered', sub: 'on: push', icon: Zap, logs: ['Workflow "CI" triggered by push', 'Queued 3 jobs on ubuntu-latest runners'] },
  { id: 'lint', label: 'Lint', sub: 'job: lint', icon: CheckCircle2, logs: ['actions/checkout@v4', 'actions/setup-node@v4 (cache: npm) ✓ cache hit', 'npm ci', 'npm run lint', '✔ 0 problems'] },
  { id: 'test', label: 'Test (Node 20, 22)', sub: 'job: test · matrix', icon: Bug, logs: ['npm ci', 'npm test', ' ✓ cart.test.ts (12)', ' ✓ checkout.test.ts (8)'] },
  { id: 'build', label: 'Build', sub: 'job: build · needs: [lint, test]', icon: CircleDashed, logs: ['npm run build', 'vite v6 building for production…', '✓ 412 modules transformed', 'dist/ 182 kB', 'upload-artifact: dist ✓'] },
  { id: 'approve', label: 'Approval', sub: 'environment: production', icon: ShieldCheck, logs: ['Waiting for review: production requires 1 reviewer', '✓ Approved by @team-lead'] },
  { id: 'deploy', label: 'Deploy', sub: 'job: deploy', icon: Rocket, logs: ['download-artifact: dist', 'Deploying to production…', '✓ Deployed: https://shop.example.com'] },
  { id: 'live', label: 'Live!', sub: 'users get the update', icon: Globe, logs: ['🎉 Pipeline finished in 2m 14s'] },
]

const stColor: Record<St, string> = {
  idle: 'border-border text-muted-foreground',
  running: 'border-cyan-400 text-cyan-300 shadow-[0_0_24px_-4px_rgba(34,211,238,.7)]',
  ok: 'border-emerald-500/70 text-emerald-300',
  fail: 'border-rose-500 text-rose-300 shadow-[0_0_24px_-4px_rgba(244,63,94,.6)]',
  waiting: 'border-amber-400 text-amber-300',
  skipped: 'border-border text-muted-foreground/50 line-through',
}

function PipelineSim() {
  const [status, setStatus] = useState<Record<string, St>>({})
  const [logs, setLogs] = useState<{ t: string; k: 'ok' | 'err' | 'out' | 'head' }[]>([])
  const [running, setRunning] = useState(false)
  const [breakTests, setBreakTests] = useState(false)
  const timers = useRef<number[]>([])
  const logBox = useRef<HTMLDivElement>(null)

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  useEffect(() => {
    logBox.current?.scrollTo({ top: logBox.current.scrollHeight, behavior: 'smooth' })
  }, [logs])

  const run = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setStatus({})
    setLogs([])
    setRunning(true)
    let t = 0
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, (t += ms)))
    let failed = false
    for (const s of STAGES) {
      at(250, () => {
        setStatus((p) => ({ ...p, [s.id]: failed ? 'skipped' : s.id === 'approve' ? 'waiting' : 'running' }))
        if (!failed) setLogs((l) => [...l, { t: `▶ ${s.label}`, k: 'head' }])
      })
      if (failed) continue
      for (const line of s.logs) {
        const broken = breakTests && s.id === 'test' && line.includes('checkout.test')
        at(s.id === 'approve' ? 650 : 260, () => setLogs((l) => [...l, broken ? { t: ' ✗ checkout.test.ts > applies discount: expected 90, got 100', k: 'err' } : { t: line, k: line.startsWith('✓') || line.startsWith(' ✓') || line.startsWith('✔') ? 'ok' : 'out' }]))
      }
      if (breakTests && s.id === 'test') {
        failed = true
        at(350, () => {
          setStatus((p) => ({ ...p, test: 'fail' }))
          setLogs((l) => [...l, { t: 'Error: Process completed with exit code 1.', k: 'err' }, { t: 'build, deploy skipped: their `needs:` failed. Production is safe. 🛡️', k: 'err' }])
        })
        continue
      }
      at(300, () => setStatus((p) => ({ ...p, [s.id]: 'ok' })))
    }
    at(400, () => setRunning(false))
  }

  return (
    <div className="rounded-3xl border bg-card p-4 sm:p-6" data-tour="pipeline">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold">Run a pipeline</h2>
          <p className="text-sm text-muted-foreground">Watch what happens after you push. Then break a test and see CI protect production.</p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={breakTests} onChange={(e) => setBreakTests(e.target.checked)} className="h-4 w-4 accent-rose-500" disabled={running} />
          Push a bug 🐛
        </label>
        <Button variant="gradient" onClick={run} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? 'Running…' : 'Push & run'}
        </Button>
      </div>
      <div className="scrollbar-thin mt-6 overflow-x-auto pb-2">
        <div className="flex min-w-[880px] items-center">
          {STAGES.map((s, i) => {
            const st = status[s.id] ?? 'idle'
            const Icon = st === 'ok' ? CheckCircle2 : st === 'fail' ? XCircle : st === 'running' ? Loader2 : s.icon
            return (
              <div key={s.id} className="flex flex-1 items-center">
                <motion.div animate={st === 'running' ? { scale: [1, 1.05, 1] } : { scale: 1 }} transition={{ repeat: st === 'running' ? Infinity : 0, duration: 0.9 }} className={cn('w-full rounded-xl border-2 bg-background/60 p-3 text-center transition-colors', stColor[st])}>
                  <Icon className={cn('mx-auto h-5 w-5', st === 'running' && 'animate-spin')} />
                  <p className="mt-1.5 text-xs font-semibold text-foreground">{s.label}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{s.sub}</p>
                </motion.div>
                {i < STAGES.length - 1 && (
                  <div className="relative mx-1 h-0.5 w-6 shrink-0 overflow-hidden rounded bg-border">
                    {(status[STAGES[i + 1].id] ?? 'idle') !== 'idle' && status[STAGES[i + 1].id] !== 'skipped' && <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} className="absolute inset-0 bg-cyan-400" />}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <div ref={logBox} className="scrollbar-thin mt-4 h-56 overflow-y-auto rounded-xl border border-white/10 bg-[hsl(var(--term))] p-3 font-mono text-xs leading-6">
        {!logs.length && <span className="text-slate-500">Logs appear here, like the Actions tab on GitHub.</span>}
        <AnimatePresence initial={false}>
          {logs.map((l, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className={cn(l.k === 'ok' && 'text-emerald-400', l.k === 'err' && 'text-rose-400', l.k === 'head' && 'mt-1 font-semibold text-cyan-300', l.k === 'out' && 'text-slate-300')}>
              {l.t}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

function WorkflowExplorer() {
  const { hash } = useLocation()
  const [wid, setWid] = useState(() => workflows.find((w) => `#${w.id}` === hash)?.id ?? workflows[0].id)
  const [ann, setAnn] = useState(0)
  const w = workflows.find((x) => x.id === wid)!
  const lines = w.yaml.split('\n')
  const a = w.annotations[ann]
  const lineAnn = (n: number) => w.annotations.findIndex((x) => n >= x.from && n <= x.to)

  useEffect(() => {
    const target = workflows.find((x) => `#${x.id}` === hash)
    if (target) {
      setWid(target.id)
      setAnn(0)
      document.getElementById('workflows')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [hash])

  return (
    <section id="workflows" className="scroll-mt-24">
      <h2 className="text-2xl font-bold tracking-tight">Workflow files, explained line by line</h2>
      <p className="mt-1 text-muted-foreground">Real, copy-ready GitHub Actions files. Click a line or an explanation to see how they match.</p>
      <div className="scrollbar-thin -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1">
        {workflows.map((x) => (
          <button
            key={x.id}
            id={x.id}
            onClick={() => {
              setWid(x.id)
              setAnn(0)
            }}
            className={cn('shrink-0 rounded-full border px-4 py-1.5 text-sm transition', x.id === wid ? 'border-violet-400 bg-violet-400/10 text-violet-300' : 'text-muted-foreground hover:text-foreground')}
          >
            {x.title}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        <Markup text={w.summary} />
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[hsl(var(--term))]">
          <div className="border-b border-white/10 px-4 py-2 font-mono text-xs text-slate-400">{w.file}</div>
          <pre className="scrollbar-thin max-h-[34rem] overflow-auto py-2 font-mono text-[12.5px] leading-6 text-slate-200">
            {lines.map((l, i) => {
              const n = i + 1
              const on = a && n >= a.from && n <= a.to
              return (
                <div
                  key={i}
                  onClick={() => {
                    const k = lineAnn(n)
                    if (k >= 0) setAnn(k)
                  }}
                  className={cn('flex cursor-pointer pr-4 transition-colors', on ? 'bg-violet-500/15' : 'hover:bg-white/5')}
                >
                  <span className={cn('w-10 shrink-0 select-none pr-3 text-right text-slate-600', on && 'text-violet-300')}>{n}</span>
                  <span className={cn('border-l-2 pl-3', on ? 'border-violet-400' : 'border-transparent')}>
                    <YamlLine line={l} />
                  </span>
                </div>
              )
            })}
          </pre>
        </div>
        <div className="space-y-2">
          {w.annotations.map((x, i) => (
            <button
              key={i}
              onClick={() => setAnn(i)}
              className={cn('block w-full rounded-xl border p-4 text-left transition', i === ann ? 'border-violet-400/60 bg-violet-400/[.07]' : 'bg-card hover:border-violet-400/40')}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className="font-mono text-[11px] text-violet-300">
                  L{x.from}
                  {x.to !== x.from && `–${x.to}`}
                </span>
                {x.title}
              </span>
              <AnimatePresence initial={false}>
                {i === ann && (
                  <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-2 text-sm leading-6 text-foreground/85">
                    <Markup text={x.text} />
                  </motion.p>
                )}
              </AnimatePresence>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function Cicd() {
  const lessons = guidesForPath('cicd')
  return (
    <div className="container space-y-16 py-10">
      <section className="grid items-center gap-8 lg:grid-cols-[1fr_1fr]">
        <div>
          <Badge color="#a78bfa">CI/CD lab</Badge>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Ship with <span className="text-gradient">confidence</span>, on autopilot
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            <strong className="text-foreground">CI</strong> (continuous integration) means every push is automatically tested. <strong className="text-foreground">CD</strong> (continuous delivery/deployment) means code that passes is automatically prepared or shipped. Think of it as a robot that checks every change before it reaches users.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          {[
            { k: 'Workflow', v: 'A YAML file in .github/workflows' },
            { k: 'Event', v: 'What starts it: push, PR, schedule' },
            { k: 'Job', v: 'A group of steps on one machine' },
            { k: 'Step', v: 'One command or action' },
            { k: 'Runner', v: 'The VM that runs a job' },
            { k: 'Action', v: 'Reusable step, e.g. checkout' },
          ].map((x, i) => (
            <motion.div key={x.k} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="rounded-xl border bg-card p-3">
              <p className="font-semibold text-violet-300">{x.k}</p>
              <p className="mt-1 text-xs text-muted-foreground">{x.v}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <PipelineSim />

      <section>
        <h2 className="text-2xl font-bold tracking-tight">Lessons: from zero to deploys</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((g, i) => (
            <Link key={g.id} to={`/guide/${g.id}`} className="card-3d rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                <Badge color={levelColor[g.level]}>{g.level}</Badge>
              </div>
              <p className="mt-2 font-semibold">{g.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{g.summary.replace(/`/g, '')}</p>
            </Link>
          ))}
        </div>
      </section>

      <WorkflowExplorer />
    </div>
  )
}
