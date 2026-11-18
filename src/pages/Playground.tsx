import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RotateCcw, Sparkles } from 'lucide-react'
import { useSim } from '@/hooks/useSim'
import { Terminal } from '@/components/sim/Terminal'
import { CommitGraph } from '@/components/sim/CommitGraph'
import { RepoPanel } from '@/components/sim/RepoPanel'
import { Button } from '@/components/ui/button'
import { decodeSetup } from '@/lib/utils'
import { cn } from '@/lib/utils'

const SCENARIOS: { name: string; desc: string; setup: string[] }[] = [
  { name: 'Empty folder', desc: 'Start from nothing', setup: [] },
  { name: 'Fresh repo', desc: 'One commit on main', setup: ['git init', 'echo "# app" > README.md', 'git add .', 'git commit -m "Initial commit"'] },
  {
    name: 'Feature branches',
    desc: 'main + 2 branches',
    setup: [
      'git init', 'echo "app" > app.js', 'git add .', 'git commit -m "Initial"',
      'git switch -c feature/login', 'echo "login" > login.js', 'git add .', 'git commit -m "Add login"',
      'git switch main', 'git switch -c feature/cart', 'echo "cart" > cart.js', 'git add .', 'git commit -m "Add cart"', 'git switch main',
    ],
  },
  {
    name: 'About to conflict',
    desc: 'Both branches edit one file',
    setup: [
      'git init', 'echo "color=blue" > theme.txt', 'git add .', 'git commit -m "Initial"',
      'git switch -c feature/dark', 'echo "color=black" > theme.txt', 'git commit -am "Dark theme"',
      'git switch main', 'echo "color=white" > theme.txt', 'git commit -am "Light theme"',
    ],
  },
  { name: 'Cloned from GitHub', desc: 'With a remote + teammate', setup: ['git clone https://github.com/you/app.git'] },
]

const IDEAS = [
  'git status',
  'git log --oneline --graph --all',
  'git switch -c my-feature',
  'git merge feature/dark',
  'teammate push "Fix typo"',
  'git pull --rebase',
  'git reset --hard HEAD~1',
  'git reflog',
]

export default function Playground() {
  const [params] = useSearchParams()
  const fromLink = useMemo(() => decodeSetup(params.get('setup')), [params])
  const intro = useMemo(
    () => [
      { kind: 'info' as const, text: 'Welcome to the Git Compass playground. This is a safe, simulated repo: nothing here touches your computer.' },
      { kind: 'hint' as const, text: fromLink.length ? 'Loaded the scenario from the guide. Try the commands yourself!' : 'Type `help` to list commands, or pick a scenario to start from.' },
    ],
    [fromLink.length],
  )
  const [active, setActive] = useState(fromLink.length ? -1 : 0)
  const sim = useSim(fromLink, intro)

  return (
    <div className="container py-8">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Playground</h1>
          <p className="mt-1 text-muted-foreground">Type real git commands. Watch the graph, the staging area and GitHub update live.</p>
        </div>
        <Button variant="outline" className="ml-auto" onClick={() => sim.reset(active >= 0 ? SCENARIOS[active].setup : fromLink)}>
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div data-tour="terminal"><Terminal sim={sim} className="h-[26rem]" /></div>
            <div className="min-w-0 rounded-xl border bg-card/60 p-2" data-tour="graph">
              <div className="flex items-center justify-between px-2 pb-1 pt-1">
                <span className="text-xs font-semibold">Commit graph</span>
                <span className="text-[10px] text-muted-foreground">hover a commit for details</span>
              </div>
              <CommitGraph state={sim.state} className="min-h-[22rem]" />
            </div>
          </div>
          <RepoPanel state={sim.state} />
        </div>
        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm font-semibold">Scenarios</p>
            <div className="mt-3 grid gap-2">
              {SCENARIOS.map((s, i) => (
                <button
                  key={s.name}
                  onClick={() => {
                    setActive(i)
                    sim.reset(s.setup)
                  }}
                  className={cn('rounded-lg border px-3 py-2 text-left transition hover:border-primary/60', active === i && 'border-primary bg-primary/10')}
                >
                  <span className="block text-sm font-medium">{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" /> Things to try
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {IDEAS.map((c) => (
                <button key={c} onClick={() => sim.run(c)} className="rounded-md border px-2 py-1 font-mono text-[11px] text-muted-foreground hover:border-primary hover:text-primary">
                  {c}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Click to run. Some only make sense in certain scenarios: that's part of learning!</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
