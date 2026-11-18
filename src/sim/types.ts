export type Files = Record<string, string>

export interface Commit {
  id: string
  parents: string[]
  message: string
  tree: Files
  /** Monotonic sequence number, used as "time" for ordering and layout. */
  seq: number
  author: string
}

export interface StashEntry {
  message: string
  base: string
  index: Files
  work: Files
}

/** A "server" (e.g. a GitHub repo) addressed by URL. */
export interface Server {
  branches: Record<string, string>
  tags: Record<string, string>
}

export type Head = { type: 'branch'; name: string } | { type: 'detached'; id: string }

export interface MergeState {
  theirs: string
  message: string
  conflicts: string[]
}

export interface RepoState {
  initialized: boolean
  /** Shared object pool. Contains commits from every server too. */
  commits: Record<string, Commit>
  branches: Record<string, string>
  head: Head
  index: Files
  work: Files
  tags: Record<string, string>
  /** remote name → url */
  remotes: Record<string, string>
  /** url → server state ("GitHub") */
  servers: Record<string, Server>
  /** remote-tracking refs, e.g. 'origin/main' → id */
  remoteRefs: Record<string, string>
  /** local branch → remote-tracking ref name */
  upstream: Record<string, string>
  stash: StashEntry[]
  reflog: { id: string; msg: string }[]
  merging: MergeState | null
  /** true right after clone, cleared by new commits (filter-repo safety check). */
  fresh: boolean
  seq: number
}

export type LineKind = 'cmd' | 'out' | 'err' | 'ok' | 'info' | 'hint'
export interface Line {
  kind: LineKind
  text: string
}

export interface RunResult {
  state: RepoState
  lines: Line[]
  /** UI should clear the terminal. */
  clear?: boolean
  /** The command errored (state is unchanged). */
  failed?: boolean
}
