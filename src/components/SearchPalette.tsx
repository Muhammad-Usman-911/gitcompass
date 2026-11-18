import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import { AnimatePresence, motion } from 'motion/react'
import { BookOpen, Gamepad2, Search, Settings, SquareTerminal, Workflow, FileCode2, Compass } from 'lucide-react'
import { search, type ResultType } from '@/lib/search'
import { Kbd } from './ui/misc'

const icons: Record<ResultType, typeof Search> = {
  guide: BookOpen,
  setting: Settings,
  command: SquareTerminal,
  challenge: Gamepad2,
  workflow: Workflow,
  page: Compass,
}
const groupNames: Record<ResultType, string> = {
  guide: 'Guides',
  setting: 'GitHub settings',
  command: 'Commands',
  challenge: 'Challenges',
  workflow: 'Workflows',
  page: 'Pages',
}
const SUGGESTIONS = ['undo last commit', 'rewrite git history', 'merge conflict', 'force push safely', 'ssh key', 'environments', 'what is ci cd', 'squash commits']

const Ctx = createContext<{ open: (q?: string) => void }>({ open: () => {} })
export const useSearch = () => useContext(Ctx)

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const navigate = useNavigate()

  const open = useCallback((initial = '') => {
    setQ(initial)
    setOpen(true)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !/input|textarea/i.test((e.target as HTMLElement).tagName))) {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const results = useMemo(() => search(q, 40), [q])
  const grouped = useMemo(() => {
    const g: Partial<Record<ResultType, typeof results>> = {}
    for (const r of results) (g[r.type] ??= []).push(r)
    return Object.entries(g) as [ResultType, typeof results][]
  }, [results])

  const go = (href: string) => {
    setOpen(false)
    navigate(href)
  }

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <motion.div className="fixed inset-0 z-[100] flex items-start justify-center bg-background/70 px-4 pt-[10vh] backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setOpen(false)}>
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="glow w-full max-w-2xl overflow-hidden rounded-2xl border bg-popover shadow-2xl"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Command shouldFilter={false} label="Search Git Compass" loop>
                <div className="flex items-center gap-2 border-b px-4">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Command.Input
                    autoFocus
                    value={q}
                    onValueChange={setQ}
                    placeholder="Search anything… e.g. “rewrite git history”, “undo commit”, “deploy keys”"
                    className="h-14 w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
                  />
                  <Kbd>Esc</Kbd>
                </div>
                <Command.List className="scrollbar-thin max-h-[60vh] overflow-y-auto p-2">
                  {!q && (
                    <div className="p-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Popular searches</p>
                      <div className="flex flex-wrap gap-2">
                        {SUGGESTIONS.map((s) => (
                          <button key={s} onClick={() => setQ(s)} className="rounded-full border px-3 py-1 text-xs hover:border-primary hover:text-primary">
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {q && !results.length && <Command.Empty className="p-6 text-center text-sm text-muted-foreground">No results for “{q}”. Try fewer words.</Command.Empty>}
                  {grouped.map(([type, items]) => (
                    <Command.Group key={type} heading={groupNames[type]} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground">
                      {items.map((r) => {
                        const Icon = r.type === 'workflow' ? FileCode2 : icons[r.type]
                        return (
                          <Command.Item
                            key={r.href + r.title}
                            value={r.href + r.title}
                            onSelect={() => go(r.href)}
                            className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 data-[selected=true]:bg-secondary"
                          >
                            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border" style={{ color: r.color, borderColor: `${r.color}44`, background: `${r.color}12` }}>
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{r.title}</span>
                              <span className="line-clamp-1 text-xs text-muted-foreground">{r.subtitle}</span>
                            </span>
                          </Command.Item>
                        )
                      })}
                    </Command.Group>
                  ))}
                </Command.List>
                <div className="flex items-center gap-3 border-t px-4 py-2 text-[11px] text-muted-foreground">
                  <span><Kbd>↑</Kbd> <Kbd>↓</Kbd> move</span>
                  <span><Kbd>Enter</Kbd> open</span>
                  <span className="ml-auto"><Kbd>Ctrl</Kbd> <Kbd>K</Kbd> or <Kbd>/</Kbd> anywhere</span>
                </div>
              </Command>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  )
}
