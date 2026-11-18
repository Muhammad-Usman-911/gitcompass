import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { readJSON, writeJSON } from './utils'

interface Progress {
  guides: string[]
  challenges: string[]
  xp: number
}
const KEY = 'gc-progress-v1'

interface Ctx extends Progress {
  markGuide: (id: string, done?: boolean) => void
  completeChallenge: (id: string, xp: number) => boolean
  reset: () => void
}

const ProgressContext = createContext<Ctx | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [p, setP] = useState<Progress>(() => readJSON(KEY, { guides: [], challenges: [], xp: 0 }))
  const save = useCallback((next: Progress) => {
    setP(next)
    writeJSON(KEY, next)
  }, [])

  const value = useMemo<Ctx>(
    () => ({
      ...p,
      markGuide: (id, done = true) => {
        const has = p.guides.includes(id)
        if (done === has) return
        save({ ...p, guides: done ? [...p.guides, id] : p.guides.filter((g) => g !== id), xp: p.xp + (done ? 10 : -10) })
      },
      completeChallenge: (id, xp) => {
        if (p.challenges.includes(id)) return false
        save({ ...p, challenges: [...p.challenges, id], xp: p.xp + xp })
        return true
      },
      reset: () => save({ guides: [], challenges: [], xp: 0 }),
    }),
    [p, save],
  )
  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  const c = useContext(ProgressContext)
  if (!c) throw new Error('useProgress outside provider')
  return c
}

export function rankFor(xp: number) {
  const ranks = [
    { at: 0, name: 'Newcomer' },
    { at: 100, name: 'Committer' },
    { at: 300, name: 'Brancher' },
    { at: 600, name: 'Merger' },
    { at: 1000, name: 'Rebaser' },
    { at: 1600, name: 'History Wizard' },
  ]
  let i = 0
  ranks.forEach((r, j) => {
    if (xp >= r.at) i = j
  })
  const next = ranks[i + 1]
  return { name: ranks[i].name, next: next?.name, pct: next ? (xp - ranks[i].at) / (next.at - ranks[i].at) : 1, toNext: next ? next.at - xp : 0 }
}
