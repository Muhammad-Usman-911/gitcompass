import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import type { SimApi } from '@/hooks/useSim'

const kindClass = {
  cmd: 'text-slate-100',
  out: 'text-slate-300',
  err: 'text-rose-400',
  ok: 'text-emerald-400',
  info: 'text-cyan-300',
  hint: 'text-amber-300/90',
} as const

const COMPLETIONS = [
  'git init', 'git status', 'git add .', 'git commit -m ""', 'git log --oneline --graph --all', 'git branch', 'git switch -c ',
  'git switch ', 'git merge ', 'git rebase ', 'git reset --soft HEAD~1', 'git reset --hard ', 'git revert HEAD --no-edit', 'git restore ',
  'git restore --staged ', 'git stash', 'git stash pop', 'git cherry-pick ', 'git tag ', 'git remote add origin ', 'git push -u origin main',
  'git push', 'git pull', 'git fetch', 'git reflog', 'git diff', 'git diff --staged', 'git show', 'git clone https://github.com/you/app.git',
  'echo "" > ', 'cat ', 'ls', 'clear', 'help', 'teammate push ""',
]

export function Terminal({ sim, className, readOnly, placeholder, prompt = '~/project' }: { sim: SimApi; className?: string; readOnly?: boolean; placeholder?: string; prompt?: string }) {
  const [value, setValue] = useState('')
  const [hIdx, setHIdx] = useState<number | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [sim.lines])

  const branch = sim.state.initialized ? (sim.state.head.type === 'branch' ? sim.state.head.name : sim.state.head.id.slice(0, 7)) : null

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const v = value
      setValue('')
      setHIdx(null)
      sim.run(v)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!sim.history.length) return
      const i = hIdx === null ? sim.history.length - 1 : Math.max(0, hIdx - 1)
      setHIdx(i)
      setValue(sim.history[i])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (hIdx === null) return
      const i = hIdx + 1
      if (i >= sim.history.length) {
        setHIdx(null)
        setValue('')
      } else {
        setHIdx(i)
        setValue(sim.history[i])
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const hits = COMPLETIONS.filter((c) => c.startsWith(value) && c !== value)
      if (hits.length) {
        const common = hits.reduce((a, b) => {
          let i = 0
          while (i < a.length && a[i] === b[i]) i++
          return a.slice(0, i)
        })
        setValue(common.length > value.length ? common : hits[0])
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      sim.setLines([])
    }
  }

  return (
    <div
      className={cn('flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[hsl(var(--term))] font-mono text-[13px] shadow-2xl', className)}
      onClick={() => input.current?.focus()}
    >
      <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
        <span className="h-3 w-3 rounded-full bg-rose-500/80" />
        <span className="h-3 w-3 rounded-full bg-amber-400/80" />
        <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
        <span className="ml-2 truncate text-xs text-slate-400">bash — {prompt}</span>
        <span className="ml-auto hidden text-[10px] text-slate-500 sm:inline">↑↓ history · Tab complete</span>
      </div>
      <div ref={scroller} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3 py-2 leading-6" aria-live="polite">
        {sim.lines.map((l, i) =>
          l.kind === 'cmd' ? (
            <div key={i} className="mt-1 break-all">
              <Prompt branch={null} path={prompt} />
              <span className="text-slate-100">{l.text}</span>
            </div>
          ) : (
            <div key={i} className={cn('whitespace-pre-wrap break-words', kindClass[l.kind])}>
              {l.text || ' '}
            </div>
          ),
        )}
        {!readOnly && (
          <div className="mt-1 flex items-center">
            <Prompt branch={branch} path={prompt} />
            <input
              ref={input}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKey}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              aria-label="Terminal input"
              placeholder={placeholder ?? 'type a command…'}
              className="min-w-0 flex-1 bg-transparent text-slate-100 caret-cyan-400 outline-none placeholder:text-slate-600"
            />
          </div>
        )}
      </div>
    </div>
  )
}

function Prompt({ branch, path }: { branch: string | null; path: string }) {
  return (
    <span className="mr-2 select-none whitespace-nowrap">
      <span className="text-emerald-400">you</span>
      <span className="text-slate-500">:</span>
      <span className="text-cyan-400">{path}</span>
      {branch && <span className="text-violet-300"> ({branch})</span>}
      <span className="text-slate-400"> $</span>
    </span>
  )
}
