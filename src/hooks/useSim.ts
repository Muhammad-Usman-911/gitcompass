import { useCallback, useRef, useState } from 'react'
import { emptyState, runAll, runCommand } from '@/sim/git'
import type { Line, RepoState } from '@/sim/types'

export interface SimApi {
  state: RepoState
  lines: Line[]
  history: string[]
  run: (cmd: string) => boolean
  reset: (setup?: string[]) => void
  setLines: (l: Line[]) => void
}

/** Holds a simulator instance: state + terminal transcript + command history. */
export function useSim(initialSetup: string[] = [], intro?: Line[]): SimApi {
  const boot = useCallback(
    (setup: string[]) => {
      const { state } = runAll(setup)
      return state
    },
    [],
  )
  const [state, setState] = useState<RepoState>(() => boot(initialSetup))
  const [lines, setLines] = useState<Line[]>(intro ?? [])
  const [history, setHistory] = useState<string[]>([])
  const stateRef = useRef(state)
  stateRef.current = state

  const run = useCallback((cmd: string) => {
    const r = runCommand(stateRef.current, cmd)
    stateRef.current = r.state
    setState(r.state)
    setHistory((h) => (cmd.trim() ? [...h, cmd] : h))
    if (r.clear) setLines([])
    else setLines((l) => [...l, { kind: 'cmd' as const, text: cmd }, ...r.lines].slice(-400))
    return !r.failed
  }, [])

  const reset = useCallback(
    (setup: string[] = initialSetup) => {
      const s = setup.length ? boot(setup) : emptyState()
      stateRef.current = s
      setState(s)
      setLines(intro ?? [])
      setHistory([])
    },
    [boot, initialSetup, intro],
  )

  return { state, lines, history, run, reset, setLines }
}
