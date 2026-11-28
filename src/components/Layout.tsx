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
      <Aurora />
      <header className="sticky top-0 z-50 px-3 pt-3">
        <div className="container flex h-14 items-center gap-3 rounded-2xl border bg-popover px-3 shadow-glass sm:px-4">
          <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="btn-gloss grid h-8 w-8 place-items-center rounded-xl text-white">
              <Compass className="h-[18px] w-[18px]" />
            </span>
            <span className="font-display">Git<span className="text-gradient">Compass</span></span>
          </Link>
          <nav className="ml-3 hidden items-center gap-0.5 lg:flex" data-tour="nav">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => cn('rounded-xl px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground', isActive && 'bg-secondary text-foreground shadow-glass')}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              data-tour="search"
              onClick={() => open()}
              className="flex h-9 items-center gap-2 rounded-xl border bg-secondary px-3 text-sm text-muted-foreground transition hover:border-primary/50 hover:text-foreground sm:w-64"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
              <span className="hidden whitespace-nowrap sm:inline">Search anything…</span>
              <span className="ml-auto hidden gap-1 sm:flex"><Kbd>Ctrl</Kbd><Kbd>K</Kbd></span>
            </button>
            <Link to="/challenges" title={`${rank.name} · ${xp} XP`} className="hidden items-center gap-1.5 rounded-xl border bg-secondary px-2.5 py-1.5 text-xs font-semibold sm:flex">
              <span className="text-amber-400">★</span>
              {xp} XP
            </Link>
            <button onClick={() => setDark((d) => !d)} className="grid h-9 w-9 place-items-center rounded-xl border bg-secondary text-muted-foreground transition hover:text-foreground" aria-label="Toggle theme">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button onClick={() => setMenu((m) => !m)} className="grid h-9 w-9 place-items-center rounded-xl border bg-secondary lg:hidden" aria-label="Menu">
              {menu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {menu && (
            <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="container mt-2 overflow-hidden rounded-2xl border bg-popover shadow-glass lg:hidden">
              <div className="grid gap-1 py-3">
                {NAV.map((n) => (
                  <NavLink key={n.to} to={n.to} className={({ isActive }) => cn('rounded-xl px-3 py-2.5 text-sm font-medium', isActive ? 'bg-secondary' : 'text-muted-foreground')}>
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
      <footer className="mt-24 px-3 pb-3">
        <div className="container flex flex-col gap-3 rounded-2xl border bg-card py-6 text-sm text-muted-foreground sm:flex-row sm:items-center">
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

/** Slow-moving colour blobs behind the frosted glass. */
function Aurora() {
  return (
    <div className="aurora" aria-hidden>
      <span className="-left-[10%] -top-[15%] h-[55vmax] w-[55vmax] bg-[hsl(188_90%_50%)]" />
      <span className="-right-[15%] top-[5%] h-[50vmax] w-[50vmax] bg-[hsl(262_85%_62%)] [animation-delay:-7s]" />
      <span className="bottom-[-25%] left-[20%] h-[45vmax] w-[45vmax] bg-[hsl(322_85%_62%)] [animation-delay:-13s] [animation-duration:28s]" />
      <span className="bottom-[5%] right-[-10%] h-[30vmax] w-[30vmax] bg-[hsl(38_95%_58%)] opacity-40 [animation-delay:-4s] [animation-duration:32s]" />
    </div>
  )
}
