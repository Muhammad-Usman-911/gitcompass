import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pause, Play, RotateCcw, SkipForward, SquareTerminal } from 'lucide-react'
import { useSim } from '@/hooks/useSim'
import { Terminal } from './Terminal'
import { CommitGraph } from './CommitGraph'
import { RepoPanel } from './RepoPanel'
import { Button, buttonClass } from '../ui/button'
import { encodeSetup } from '@/lib/utils'

/** "Watch it" demo: silent setup, then commands replayed one by one with animation. */
export function SandboxDemo({ setup = [], commands, speed = 1500 }: { setup?: string[]; commands: string[]; speed?: number }) {
  const intro = useMemo(() => [{ kind: 'info' as const, text: 'Demo ready. Press Play, or step through one command at a time.' }], [])
  const sim = useSim(setup, intro)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  const next = () => {
    if (step >= commands.length) return
    sim.run(commands[step])
    setStep((s) => s + 1)
  }

  useEffect(() => {
    if (!playing) return
    if (step >= commands.length) {
      setPlaying(false)
      return
    }
    timer.current = window.setTimeout(next, step === 0 ? 300 : speed)
    return () => window.clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, step])

  const restart = () => {
    setPlaying(false)
    setStep(0)
    sim.reset(setup)
  }

  const done = step >= commands.length
  return (
    <div className="overflow-hidden rounded-2xl border bg-card/50">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <span className="text-sm font-semibold">Watch it happen</span>
        <span className="text-xs text-muted-foreground">
          step {Math.min(step, commands.length)}/{commands.length}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          {done ? (
            <Button size="sm" variant="secondary" onClick={restart}>
              <RotateCcw className="h-3.5 w-3.5" /> Replay
            </Button>
          ) : (
            <>
              <Button size="sm" variant="gradient" onClick={() => setPlaying((p) => !p)}>
                {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {playing ? 'Pause' : step ? 'Resume' : 'Play'}
              </Button>
              <Button size="sm" variant="outline" onClick={next} disabled={playing}>
                <SkipForward className="h-3.5 w-3.5" /> Step
              </Button>
            </>
          )}
          <Link to={`/playground?setup=${encodeSetup(setup)}`} className={buttonClass('outline', 'sm')}>
            <SquareTerminal className="h-3.5 w-3.5" /> Try it yourself
          </Link>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 border-b px-4 py-2">
        {commands.map((c, i) => (
          <code
            key={i}
            className={`rounded-md border px-2 py-0.5 font-mono text-[11px] transition ${i < step ? 'border-emerald-500/40 text-emerald-400' : i === step ? 'border-primary text-primary' : 'text-muted-foreground'}`}
          >
            {c}
          </code>
        ))}
      </div>
      <div className="grid gap-3 p-3 lg:grid-cols-[1fr_1.15fr]">
        <Terminal sim={sim} readOnly className="h-72" />
        <div className="min-w-0 rounded-xl border bg-background/40 p-2">
          <CommitGraph state={sim.state} className="h-full min-h-[16rem]" />
        </div>
      </div>
      <div className="px-3 pb-3">
        <RepoPanel state={sim.state} />
      </div>
    </div>
  )
}

/** Looping, non-interactive demo for the home page hero. */
export function AutoDemo() {
  const script = useMemo(
    () => [
      'git init',
      'echo "hello" > app.js',
      'git add .',
      'git commit -m "First commit"',
      'git switch -c feature/login',
      'echo "login" > login.js',
      'git add .',
      'git commit -m "Add login"',
      'git switch main',
      'echo "v2" >> app.js',
      'git commit -am "Improve app"',
      'git merge feature/login',
      'git tag v1.0',
    ],
    [],
  )
  const sim = useSim()
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = window.setTimeout(
      () => {
        if (i >= script.length) {
          sim.reset([])
          setI(0)
          return
        }
        sim.run(script[i])
        setI(i + 1)
      },
      i >= script.length ? 3500 : 1100,
    )
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])
  return (
    <div className="grid gap-3">
      <Terminal sim={sim} readOnly className="h-48" />
      <div className="rounded-xl border bg-card/60 p-2 backdrop-blur">
        <CommitGraph state={sim.state} compact className="min-h-[11rem]" />
      </div>
    </div>
  )
}
