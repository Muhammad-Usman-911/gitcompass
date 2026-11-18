import { AnimatePresence, motion } from 'motion/react'
import { Archive, Cloud, FileText, GitCommitHorizontal, Inbox, Layers } from 'lucide-react'
import { inspect } from '@/sim/git'
import type { RepoState } from '@/sim/types'
import { cn } from '@/lib/utils'

type FileState = 'untracked' | 'modified' | 'deleted' | 'staged' | 'clean' | 'conflict'
const fileStyle: Record<FileState, string> = {
  untracked: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  modified: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  deleted: 'border-rose-500/40 bg-rose-500/10 text-rose-300 line-through',
  staged: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  clean: 'border-border bg-secondary/40 text-muted-foreground',
  conflict: 'border-rose-500 bg-rose-500/20 text-rose-200',
}

function Chip({ name, st, title }: { name: string; st: FileState; title?: string }) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      title={title ?? st}
      className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px]', fileStyle[st])}
    >
      <FileText className="h-3 w-3" />
      {name}
    </motion.span>
  )
}

function Zone({ title, icon: Icon, hint, children }: { title: string; icon: typeof Inbox; hint: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border bg-card/60 p-2.5">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {title}
      </div>
      <div className="flex min-h-[26px] flex-wrap gap-1">
        <AnimatePresence mode="popLayout">{children}</AnimatePresence>
      </div>
      <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">{hint}</p>
    </div>
  )
}

export function RepoPanel({ state, className }: { state: RepoState; className?: string }) {
  if (!state.initialized) return null
  const r = inspect(state)
  const ht = r.headTree()
  const staged = new Set(r.stagedChanges())
  const unstaged = new Set(r.unstagedChanges())
  const untracked = new Set(r.untracked())
  const conflicts = new Set(state.merging?.conflicts.filter((p) => (state.work[p] ?? '').includes('<<<<<<<')) ?? [])
  const workFiles = Object.keys({ ...state.work, ...Object.fromEntries([...unstaged].map((p) => [p, ''])) }).sort()
  const url = state.remotes.origin
  const server = url ? state.servers[url] : undefined

  return (
    <div className={cn('grid gap-2 sm:grid-cols-2 xl:grid-cols-4', className)}>
      <Zone title="Working directory" icon={Inbox} hint="Your files on disk. Red = untracked, yellow = changed.">
        {workFiles.map((p) => (
          <Chip key={p} name={p} st={conflicts.has(p) ? 'conflict' : untracked.has(p) ? 'untracked' : unstaged.has(p) ? (p in state.work ? 'modified' : 'deleted') : 'clean'} />
        ))}
      </Zone>
      <Zone title="Staging area (index)" icon={Layers} hint="What the next commit will contain. Green = staged change.">
        {[...staged].map((p) => (
          <Chip key={p} name={p} st={p in state.index ? 'staged' : 'deleted'} title={p in ht ? (p in state.index ? 'modified' : 'deletion staged') : 'new file'} />
        ))}
        {!staged.size && <span className="text-[11px] text-muted-foreground">nothing staged</span>}
      </Zone>
      <Zone title={`HEAD commit${r.headId() ? ` · ${r.headId()!.slice(0, 7)}` : ''}`} icon={GitCommitHorizontal} hint="The snapshot your branch points to.">
        {Object.keys(ht)
          .sort()
          .map((p) => (
            <Chip key={p} name={p} st="clean" />
          ))}
        {!Object.keys(ht).length && <span className="text-[11px] text-muted-foreground">no commits yet</span>}
      </Zone>
      <Zone title={url ? 'GitHub (origin)' : 'Remote'} icon={url ? Cloud : Archive} hint={url ? url.replace('https://', '') : 'No remote. Add one with git remote add origin <url>.'}>
        {server &&
          Object.entries(server.branches).map(([b, id]) => (
            <span key={b} className="inline-flex items-center gap-1 rounded-md border border-violet-500/40 bg-violet-500/10 px-1.5 py-0.5 font-mono text-[11px] text-violet-300">
              {b} → {id.slice(0, 7)}
            </span>
          ))}
        {server && !Object.keys(server.branches).length && <span className="text-[11px] text-muted-foreground">empty repo</span>}
        {state.stash.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[11px] text-cyan-300">
            <Archive className="h-3 w-3" /> stash: {state.stash.length}
          </span>
        )}
      </Zone>
    </div>
  )
}
