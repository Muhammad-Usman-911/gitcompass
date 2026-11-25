import { useEffect, useState, lazy, Suspense } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Compass, Menu, Moon, Search, Sun, X, Github } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useSearch } from './SearchPalette'
import { Kbd } from './ui/misc'
import { useProgress, rankFor } from '@/lib/progress'
import { cn, readJSON, writeJSON } from '@/lib/utils'

const GuideBot = lazy(() => import('@/bot/GuideBot'))

const NAV = [
  { to: '/learn', label: 'Learn' },
  { to: '/playground', label: 'Playground' },
  { to: '/challenges', label: 'Challenges' },
  { to: '/github', label: 'GitHub tour' },
  { to: '/cicd', label: 'CI/CD' },
  { to: '/commands', label: 'Commands' },
  { to: '/changelog', label: 'Changelog' },
]

export function Layout() {
  const { open } = useSearch()
  const { xp } = useProgress()
  const [menu, setMenu] = useState(false)
  const [dark, setDark] = useState(() => readJSON('gc-theme', 'dark') === 'dark')
  const loc = useLocation()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    writeJSON('gc-theme', dark ? 'dark' : 'light')
  }, [dark])
  useEffect(() => {
    setMenu(false)
    window.scrollTo({ top: 0 })
  }, [loc.pathname])

  const rank = rankFor(xp)

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <header className="sticky top-0 z-50 border-b bg-background/75 backdrop-blur-xl">
        <div className="container flex h-16 items-center gap-4">
          <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-primary-foreground shadow-lg">
              <Compass className="h-[18px] w-[18px]" />
            </span>
            <span>Git<span className="text-gradient">Compass</span></span>
          </Link>
          <nav className="ml-4 hidden items-center gap-1 lg:flex" data-tour="nav">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => cn('rounded-md px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground', isActive && 'bg-secondary text-foreground')}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              data-tour="search"
              onClick={() => open()}
              className="flex h-9 items-center gap-2 rounded-lg border bg-secondary/50 px-3 text-sm text-muted-foreground transition hover:border-primary/50 hover:text-foreground sm:w-64"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
              <span className="hidden whitespace-nowrap sm:inline">Search anything…</span>
              <span className="ml-auto hidden gap-1 sm:flex"><Kbd>Ctrl</Kbd><Kbd>K</Kbd></span>
            </button>
            <Link to="/challenges" title={`${rank.name} · ${xp} XP`} className="hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium sm:flex">
              <span className="text-amber-400">★</span>
              {xp} XP
            </Link>
            <button onClick={() => setDark((d) => !d)} className="grid h-9 w-9 place-items-center rounded-lg border text-muted-foreground hover:text-foreground" aria-label="Toggle theme">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button onClick={() => setMenu((m) => !m)} className="grid h-9 w-9 place-items-center rounded-lg border lg:hidden" aria-label="Menu">
              {menu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {menu && (
            <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t lg:hidden">
              <div className="container grid gap-1 py-3">
                {NAV.map((n) => (
                  <NavLink key={n.to} to={n.to} className={({ isActive }) => cn('rounded-md px-3 py-2 text-sm', isActive ? 'bg-secondary' : 'text-muted-foreground')}>
                    {n.label}
                  </NavLink>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
      <main className="relative">
        <Outlet />
      </main>
      <footer className="mt-24 border-t">
        <div className="container flex flex-col gap-3 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <span className="flex items-center gap-2"><Compass className="h-4 w-4 text-primary" /> Git Compass: learn Git, GitHub & CI/CD by doing.</span>
          <span className="sm:ml-auto">Built by Muhammad Usman</span>
          <a href="https://github.com/Muhammad-Usman-911" className="flex items-center gap-1 hover:text-foreground" target="_blank" rel="noreferrer">
            <Github className="h-4 w-4" /> GitHub
          </a>
        </div>
      </footer>
      <Suspense fallback={null}>
        <GuideBot />
      </Suspense>
    </div>
  )
}
