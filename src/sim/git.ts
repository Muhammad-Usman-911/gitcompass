// A small, deterministic Git simulator. It models commits, branches, the index,
// the working directory, tags, stash, remotes ("servers") and reflog well enough
// to teach how commands change a repository. Every command is a pure function:
// (state, input) -> new state + terminal lines.

import type { Commit, Files, Line, RepoState, RunResult, Server } from './types'

export function emptyState(): RepoState {
  return {
    initialized: false,
    commits: {},
    branches: {},
    head: { type: 'branch', name: 'main' },
    index: {},
    work: {},
    tags: {},
    remotes: {},
    servers: {},
    remoteRefs: {},
    upstream: {},
    stash: [],
    reflog: [],
    merging: null,
    fresh: false,
    seq: 0,
  }
}

// ---------------------------------------------------------------- helpers

class GitError extends Error {}
const fail = (msg: string): never => {
  throw new GitError(msg)
}

function hash(input: string): string {
  // FNV-1a 32 bit, twice with different seeds → 7 hex chars, deterministic.
  let h1 = 0x811c9dc5
  let h2 = 0x01000193 ^ 0x5bd1e995
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193)
    h2 = Math.imul(h2 ^ c, 0x5bd1e995)
  }
  return ((h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16)).slice(0, 7)
}

const sameFiles = (a: Files, b: Files) => {
  const ka = Object.keys(a)
  if (ka.length !== Object.keys(b).length) return false
  return ka.every((k) => k in b && a[k] === b[k])
}

const allPaths = (...trees: Files[]) => [...new Set(trees.flatMap((t) => Object.keys(t)))].sort()

export function tokenize(input: string): string[] {
  const out: string[] = []
  let cur = ''
  let quote: string | null = null
  let has = false
  for (const ch of input.trim()) {
    if (quote) {
      if (ch === quote) quote = null
      else cur += ch
    } else if (ch === '"' || ch === "'") {
      quote = ch
      has = true
    } else if (/\s/.test(ch)) {
      if (has || cur) out.push(cur)
      cur = ''
      has = false
    } else {
      cur += ch
      has = true
    }
  }
  if (has || cur) out.push(cur)
  return out
}

/** Pulls flags out of args. `spec` maps flag → takes value? */
function parseArgs(args: string[], spec: Record<string, boolean>) {
  const flags: Record<string, string | true> = {}
  const rest: string[] = []
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a in spec) {
      if (spec[a]) {
        if (i + 1 >= args.length) fail(`error: switch \`${a}' requires a value`)
        flags[a] = args[++i]
      } else flags[a] = true
    } else if (/^-[a-zA-Z]{2,}$/.test(a) && [...a.slice(1)].every((c) => `-${c}` in spec)) {
      // combined short flags like -am "msg"
      const chars = [...a.slice(1)]
      chars.forEach((c, j) => {
        const f = `-${c}`
        if (spec[f]) {
          if (j !== chars.length - 1) fail(`error: switch \`${f}' requires a value`)
          if (i + 1 >= args.length) fail(`error: switch \`${f}' requires a value`)
          flags[f] = args[++i]
        } else flags[f] = true
      })
    } else if (a.startsWith('-') && a !== '-' && a !== '--') {
      fail(`error: unknown option \`${a.replace(/^-+/, '')}'`)
    } else if (a !== '--') rest.push(a)
  }
  return { flags, rest }
}

// ---------------------------------------------------------------- engine

export class Repo {
  s: RepoState
  lines: Line[] = []
  clear = false

  constructor(state: RepoState) {
    this.s = structuredClone(state)
  }

  out(text: string, kind: Line['kind'] = 'out') {
    for (const t of text.split('\n')) this.lines.push({ kind, text: t })
  }

  // ---- refs
  headId(): string | undefined {
    const h = this.s.head
    return h.type === 'branch' ? this.s.branches[h.name] : h.id
  }
  headTree(): Files {
    const id = this.headId()
    return id ? this.s.commits[id].tree : {}
  }
  branchName() {
    return this.s.head.type === 'branch' ? this.s.head.name : null
  }

  resolve(ref: string): string {
    const m = ref.match(/^(.*?)((?:[~^]\d*)*)$/)!
    let base = m[1]
    const suffix = m[2]
    let id: string | undefined
    const reflogRef = base.match(/^(?:HEAD)?@\{(\d+)\}$/)
    if (reflogRef) {
      id = this.s.reflog[Number(reflogRef[1])]?.id
      if (!id) fail(`fatal: log for 'HEAD' only has ${this.s.reflog.length} entries`)
    } else if (base === 'HEAD' || base === '@') {
      id = this.headId()
      if (!id) fail(`fatal: ambiguous argument '${ref}': unknown revision or path not in the working tree.`)
    } else if (base in this.s.branches) id = this.s.branches[base]
    else if (base in this.s.tags) id = this.s.tags[base]
    else if (base in this.s.remoteRefs) id = this.s.remoteRefs[base]
    else if (base.startsWith('refs/heads/') && base.slice(11) in this.s.branches) id = this.s.branches[base.slice(11)]
    else if (/^[0-9a-f]{4,}$/.test(base)) {
      const hits = Object.keys(this.s.commits).filter((c) => c.startsWith(base))
      if (hits.length === 1) id = hits[0]
      else if (hits.length > 1) fail(`error: short object ID ${base} is ambiguous`)
    }
    if (!id) fail(`fatal: ambiguous argument '${ref}': unknown revision or path not in the working tree.`)
    for (const part of suffix.match(/[~^]\d*/g) ?? []) {
      const n = part.length > 1 ? Number(part.slice(1)) : 1
      if (part[0] === '~') {
        for (let i = 0; i < n; i++) {
          const p = this.s.commits[id!].parents[0]
          if (!p) fail(`fatal: ambiguous argument '${ref}': unknown revision or path not in the working tree.`)
          id = p
        }
      } else {
        const p = this.s.commits[id!].parents[n - 1]
        if (!p) fail(`fatal: ambiguous argument '${ref}': unknown revision or path not in the working tree.`)
        id = p
      }
    }
    base = id!
    return base
  }

  tryResolve(ref: string): string | null {
    try {
      return this.resolve(ref)
    } catch {
      return null
    }
  }

  ancestors(id: string): Set<string> {
    const seen = new Set<string>()
    const stack = [id]
    while (stack.length) {
      const c = stack.pop()!
      if (seen.has(c)) continue
      seen.add(c)
      stack.push(...this.s.commits[c].parents)
    }
    return seen
  }

  isAncestor(a: string, b: string) {
    return this.ancestors(b).has(a)
  }

  mergeBase(a: string, b: string): string | null {
    const aa = this.ancestors(a)
    let best: string | null = null
    for (const c of this.ancestors(b)) {
      if (aa.has(c) && (!best || this.s.commits[c].seq > this.s.commits[best].seq)) best = c
    }
    return best
  }

  short(id: string) {
    return id.slice(0, 7)
  }

  // ---- mutation helpers
  newCommit(parents: string[], message: string, tree: Files, author = 'You'): string {
    this.s.seq++
    const id = hash(`${parents.join(',')}|${message}|${JSON.stringify(tree)}|${this.s.seq}`)
    const c: Commit = { id, parents, message, tree: { ...tree }, seq: this.s.seq, author }
    this.s.commits[id] = c
    return id
  }

  setHead(id: string, reflogMsg: string) {
    const h = this.s.head
    if (h.type === 'branch') this.s.branches[h.name] = id
    else this.s.head = { type: 'detached', id }
    this.s.reflog.unshift({ id, msg: reflogMsg })
  }

  /** Untracked files: in the working dir but not in the index. */
  untracked(): string[] {
    return Object.keys(this.s.work).filter((p) => !(p in this.s.index)).sort()
  }

  stagedChanges(): string[] {
    const ht = this.headTree()
    return allPaths(ht, this.s.index).filter((p) => ht[p] !== this.s.index[p])
  }

  unstagedChanges(): string[] {
    return Object.keys(this.s.index)
      .filter((p) => this.s.work[p] !== this.s.index[p])
      .sort()
  }

  isDirty() {
    return this.stagedChanges().length > 0 || this.unstagedChanges().length > 0
  }

  /** Move HEAD to a different tree, keeping untracked files. */
  checkoutTree(tree: Files) {
    const keep: Files = {}
    for (const p of this.untracked()) keep[p] = this.s.work[p]
    this.s.index = { ...tree }
    this.s.work = { ...tree, ...keep }
  }

  requireRepo() {
    if (!this.s.initialized) fail('fatal: not a git repository (or any of the parent directories): .git\nhint: run `git init` first (or `git clone <url>`).')
  }

  requireCommit(): string {
    const id = this.headId()
    if (!id) fail(`fatal: your current branch '${this.branchName()}' does not have any commits yet`)
    return id!
  }

  /** 3-way file merge. Returns merged tree + conflicting paths. */
  merge3(base: Files, ours: Files, theirs: Files, oursLabel: string, theirsLabel: string) {
    const out: Files = {}
    const conflicts: string[] = []
    for (const p of allPaths(base, ours, theirs)) {
      const b = base[p]
      const o = ours[p]
      const t = theirs[p]
      let r: string | undefined
      if (o === t) r = o
      else if (b === o) r = t
      else if (b === t) r = o
      else {
        conflicts.push(p)
        r = `<<<<<<< ${oursLabel}\n${o ?? ''}\n=======\n${t ?? ''}\n>>>>>>> ${theirsLabel}`
      }
      if (r !== undefined) out[p] = r
    }
    return { tree: out, conflicts }
  }

  describeHead() {
    const h = this.s.head
    return h.type === 'branch' ? h.name : this.short(h.id)
  }

  decorations(id: string): string {
    const d: string[] = []
    const h = this.s.head
    for (const [b, c] of Object.entries(this.s.branches)) {
      if (c !== id) continue
      if (h.type === 'branch' && h.name === b) d.unshift(`HEAD -> ${b}`)
      else d.push(b)
    }
    if (h.type === 'detached' && h.id === id) d.unshift('HEAD')
    for (const [r, c] of Object.entries(this.s.remoteRefs)) if (c === id) d.push(r)
    for (const [t, c] of Object.entries(this.s.tags)) if (c === id) d.push(`tag: ${t}`)
    return d.length ? ` (${d.join(', ')})` : ''
  }

  // ---------------------------------------------------------------- dispatcher
  run(input: string) {
    const tokens = tokenize(input)
    if (!tokens.length) return
    const [cmd, ...args] = tokens
    switch (cmd) {
      case 'git':
        return this.git(args)
      case 'ls':
        return this.out(Object.keys(this.s.work).sort().join('  ') || '')
      case 'cat': {
        if (!args.length) fail('cat: missing file operand')
        for (const f of args) {
          if (!(f in this.s.work)) fail(`cat: ${f}: No such file or directory`)
          this.out(this.s.work[f])
        }
        return
      }
      case 'touch':
        for (const f of args) if (!(f in this.s.work)) this.s.work[f] = ''
        return
      case 'rm':
        for (const f of args.filter((a) => !a.startsWith('-'))) {
          if (!(f in this.s.work)) fail(`rm: cannot remove '${f}': No such file or directory`)
          delete this.s.work[f]
        }
        return
      case 'echo': {
        const i = args.findIndex((a) => a === '>' || a === '>>')
        if (i === -1) return this.out(args.join(' '))
        const text = args.slice(0, i).join(' ')
        const file = args[i + 1]
        if (!file) fail('bash: syntax error near unexpected token `newline\'')
        if (args[i] === '>>' && this.s.work[file]) this.s.work[file] = `${this.s.work[file]}\n${text}`
        else this.s.work[file] = text
        return
      }
      case 'clear':
        this.clear = true
        return
      case 'help':
        return this.out(HELP, 'info')
      case 'teammate':
        return this.teammate(args)
      case 'cd':
      case 'pwd':
        return this.out('/home/you/project')
      default:
        fail(`${cmd}: command not found. Type \`help\` to see what this simulator supports.`)
    }
  }

  git(args: string[]) {
    const [sub, ...rest] = args
    if (!sub || sub === 'help' || sub === '--help') return this.out(HELP, 'info')
    if (sub === '--version' || sub === 'version') return this.out('git version 2.47.0 (Git Compass simulator)')
    if (sub === 'init') return this.init()
    if (sub === 'clone') return this.clone(rest)
    if (sub === 'config') return this.out('(config saved — the simulator accepts config but does not need it)', 'info')
    this.requireRepo()
    const fn: Record<string, (a: string[]) => void> = {
      status: () => this.status(),
      add: (a) => this.add(a),
      commit: (a) => this.commit(a),
      log: (a) => this.log(a),
      show: (a) => this.show(a),
      diff: (a) => this.diff(a),
      branch: (a) => this.branch(a),
      switch: (a) => this.switchCmd(a),
      checkout: (a) => this.checkout(a),
      merge: (a) => this.mergeCmd(a),
      rebase: (a) => this.rebase(a),
      'cherry-pick': (a) => this.cherryPick(a),
      revert: (a) => this.revert(a),
      reset: (a) => this.reset(a),
      restore: (a) => this.restore(a),
      rm: (a) => this.rmCmd(a),
      mv: (a) => this.mv(a),
      stash: (a) => this.stashCmd(a),
      tag: (a) => this.tag(a),
      remote: (a) => this.remote(a),
      push: (a) => this.push(a),
      fetch: (a) => this.fetch(a),
      pull: (a) => this.pull(a),
      reflog: () => this.reflogCmd(),
      'filter-repo': (a) => this.filterRepo(a),
    }
    const f = fn[sub]
    if (!f) {
      if (['bisect', 'blame', 'clean', 'worktree', 'submodule', 'gc', 'prune'].includes(sub))
        fail(`git ${sub}: not available in the simulator — see the command reference for how it works.`)
      fail(`git: '${sub}' is not a git command. See 'git help'.`)
    }
    f(rest)
  }

  // ---------------------------------------------------------------- commands
  init() {
    if (this.s.initialized) return this.out('Reinitialized existing Git repository in /home/you/project/.git/')
    this.s.initialized = true
    this.s.head = { type: 'branch', name: 'main' }
    this.out('Initialized empty Git repository in /home/you/project/.git/', 'ok')
  }

  clone(args: string[]) {
    const { rest } = parseArgs(args, { '--no-single-branch': false, '--depth': true })
    const url = rest[0] ?? fail('fatal: You must specify a repository to clone.')
    if (this.s.initialized) fail(`fatal: destination path already exists and is not an empty directory.\nhint: the simulator holds one repo — reset the sandbox first.`)
    const name = url.replace(/\.git$/, '').split(/[/:]/).pop() || 'repo'
    this.s.initialized = true
    this.s.head = { type: 'branch', name: 'main' }
    let server = this.s.servers[url]
    if (!server) {
      const t1 = { 'README.md': `# ${name}` }
      const c1 = this.newCommit([], 'Initial commit', t1, 'Teammate')
      const t2 = { ...t1, 'app.js': 'console.log("hello")' }
      const c2 = this.newCommit([c1], 'Add app', t2, 'Teammate')
      const t3 = { ...t2, 'README.md': `# ${name}\nA sample project.` }
      const c3 = this.newCommit([c2], 'Update README', t3, 'Teammate')
      server = { branches: { main: c3 }, tags: {} }
      this.s.servers[url] = server
    }
    this.s.remotes.origin = url
    for (const [b, id] of Object.entries(server.branches)) this.s.remoteRefs[`origin/${b}`] = id
    for (const [t, id] of Object.entries(server.tags)) this.s.tags[t] = id
    const def = server.branches.main ? 'main' : Object.keys(server.branches)[0]
    if (def) {
      this.s.branches[def] = server.branches[def]
      this.s.head = { type: 'branch', name: def }
      this.s.upstream[def] = `origin/${def}`
      this.checkoutTree(this.s.commits[server.branches[def]].tree)
      this.s.reflog.unshift({ id: server.branches[def], msg: `clone: from ${url}` })
    }
    this.s.fresh = true
    this.out(`Cloning into '${name}'...\nremote: Enumerating objects: done.\nReceiving objects: 100%, done.`, 'ok')
  }

  status() {
    const h = this.s.head
    if (h.type === 'branch') this.out(`On branch ${h.name}`)
    else this.out(`HEAD detached at ${this.short(h.id)}`, 'hint')
    const b = this.branchName()
    if (b && this.s.upstream[b] && this.s.branches[b]) {
      const up = this.s.remoteRefs[this.s.upstream[b]]
      if (up) {
        const local = this.s.branches[b]
        const la = this.ancestors(local)
        const ua = this.ancestors(up)
        const ahead = [...la].filter((c) => !ua.has(c)).length
        const behind = [...ua].filter((c) => !la.has(c)).length
        const u = this.s.upstream[b]
        if (!ahead && !behind) this.out(`Your branch is up to date with '${u}'.`)
        else if (ahead && !behind) this.out(`Your branch is ahead of '${u}' by ${ahead} commit${ahead > 1 ? 's' : ''}.\n  (use "git push" to publish your local commits)`)
        else if (!ahead && behind) this.out(`Your branch is behind '${u}' by ${behind} commit${behind > 1 ? 's' : ''}, and can be fast-forwarded.\n  (use "git pull" to update your local branch)`)
        else this.out(`Your branch and '${u}' have diverged,\nand have ${ahead} and ${behind} different commits each, respectively.\n  (use "git pull" if you want to integrate the remote branch with yours)`)
      }
    }
    if (!this.headId()) this.out('\nNo commits yet')
    if (this.s.merging) {
      const unresolved = this.s.merging.conflicts.filter((p) => (this.s.index[p] ?? '').includes('<<<<<<<') || this.s.index[p] !== this.s.work[p])
      if (unresolved.length) {
        this.out('\nYou have unmerged paths.\n  (fix conflicts and run "git commit")\n  (use "git merge --abort" to abort the merge)\n\nUnmerged paths:', 'hint')
        for (const p of unresolved) this.out(`\tboth modified:   ${p}`, 'err')
      } else this.out('\nAll conflicts fixed but you are still merging.\n  (use "git commit" to conclude merge)', 'hint')
    }
    const staged = this.stagedChanges()
    const unstaged = this.unstagedChanges().filter((p) => !this.s.merging?.conflicts.includes(p) || !(this.s.index[p] ?? '').includes('<<<<<<<'))
    const untracked = this.untracked()
    const ht = this.headTree()
    if (staged.length) {
      this.out('\nChanges to be committed:\n  (use "git restore --staged <file>..." to unstage)')
      for (const p of staged) {
        const kind = !(p in ht) ? 'new file' : !(p in this.s.index) ? 'deleted' : 'modified'
        this.out(`\t${kind}:   ${p}`, 'ok')
      }
    }
    if (unstaged.length) {
      this.out('\nChanges not staged for commit:\n  (use "git add <file>..." to update what will be committed)\n  (use "git restore <file>..." to discard changes in working directory)')
      for (const p of unstaged) this.out(`\t${p in this.s.work ? 'modified' : 'deleted'}:   ${p}`, 'err')
    }
    if (untracked.length) {
      this.out('\nUntracked files:\n  (use "git add <file>..." to include in what will be committed)')
      for (const p of untracked) this.out(`\t${p}`, 'err')
    }
    if (!staged.length && !unstaged.length && !untracked.length && !this.s.merging)
      this.out(this.headId() ? '\nnothing to commit, working tree clean' : '\nnothing to commit (create/copy files and use "git add" to track)')
  }

  add(args: string[]) {
    const { rest } = parseArgs(args, { '-A': false, '--all': false, '-u': false })
    const all = args.some((a) => a === '-A' || a === '--all' || a === '.')
    if (!rest.length && !all) fail('Nothing specified, nothing added.\nhint: Maybe you wanted to say \'git add .\'?')
    if (all) {
      this.s.index = { ...this.s.work }
      return
    }
    if (args.includes('-u')) {
      for (const p of Object.keys(this.s.index)) {
        if (p in this.s.work) this.s.index[p] = this.s.work[p]
        else delete this.s.index[p]
      }
      return
    }
    for (const p of rest) {
      if (p in this.s.work) this.s.index[p] = this.s.work[p]
      else if (p in this.s.index) delete this.s.index[p]
      else fail(`fatal: pathspec '${p}' did not match any files`)
    }
  }

  commit(args: string[]) {
    const { flags } = parseArgs(args, { '-m': true, '--message': true, '-a': false, '--all': false, '--amend': false, '--no-edit': false, '-q': false })
    const amend = !!flags['--amend']
    if (flags['-a'] || flags['--all']) {
      for (const p of Object.keys(this.s.index)) {
        if (p in this.s.work) this.s.index[p] = this.s.work[p]
        else delete this.s.index[p]
      }
    }
    let msg = (flags['-m'] ?? flags['--message']) as string | undefined
    const headId = this.headId()
    if (amend) {
      if (!headId) fail('fatal: You have nothing to amend.')
      const old = this.s.commits[headId!]
      if (!msg) {
        if (!flags['--no-edit']) fail('error: the simulator has no text editor.\nhint: use `git commit --amend -m "new message"` or `git commit --amend --no-edit`.')
        msg = old.message
      }
      const id = this.newCommit(old.parents, msg!, this.s.index)
      this.setHead(id, `commit (amend): ${msg}`)
      this.s.fresh = false
      this.out(`[${this.describeHead()} ${this.short(id)}] ${msg}`, 'ok')
      this.out(`(amended: ${this.short(headId!)} was replaced by ${this.short(id)})`, 'hint')
      return
    }
    if (this.s.merging) {
      const bad = this.s.merging.conflicts.filter((p) => (this.s.index[p] ?? '').includes('<<<<<<<'))
      if (bad.length) fail(`error: Committing is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use 'git add <file>'\n\tboth modified: ${bad.join(', ')}`)
    }
    if (!msg) {
      if (this.s.merging) msg = this.s.merging.message
      else fail('error: the simulator has no text editor.\nhint: use `git commit -m "your message"`.')
    }
    if (!this.s.merging && headId && sameFiles(this.s.index, this.headTree())) {
      const unstaged = this.unstagedChanges().length + this.untracked().length
      fail(unstaged ? 'no changes added to commit (use "git add" and/or "git commit -a")' : 'nothing to commit, working tree clean')
    }
    if (!headId && !Object.keys(this.s.index).length) fail('nothing to commit (create/copy files and use "git add" to track)')
    const parents = headId ? [headId] : []
    if (this.s.merging) parents.push(this.s.merging.theirs)
    const id = this.newCommit(parents, msg!, this.s.index)
    const label = !headId ? ' (root-commit)' : ''
    this.setHead(id, `commit${this.s.merging ? ' (merge)' : ''}: ${msg}`)
    this.s.merging = null
    this.s.fresh = false
    const changed = allPaths(parents[0] ? this.s.commits[parents[0]].tree : {}, this.s.index).filter(
      (p) => (parents[0] ? this.s.commits[parents[0]].tree[p] : undefined) !== this.s.index[p],
    ).length
    this.out(`[${this.describeHead()}${label} ${this.short(id)}] ${msg}\n ${changed} file${changed === 1 ? '' : 's'} changed`, 'ok')
  }

  reachable(starts: string[]): Commit[] {
    const seen = new Set<string>()
    for (const s of starts) for (const c of this.ancestors(s)) seen.add(c)
    return [...seen].map((c) => this.s.commits[c]).sort((a, b) => b.seq - a.seq)
  }

  log(args: string[]) {
    const { flags, rest } = parseArgs(args, { '--oneline': false, '--graph': false, '--all': false, '-n': true, '--decorate': false, '-p': false, '--stat': false })
    let starts: string[]
    if (flags['--all']) starts = [...Object.values(this.s.branches), ...Object.values(this.s.remoteRefs), ...Object.values(this.s.tags), ...(this.headId() ? [this.headId()!] : [])]
    else if (rest.length) starts = rest.map((r) => this.resolve(r))
    else starts = [this.requireCommit()]
    let list = this.reachable(starts)
    if (flags['-n']) list = list.slice(0, Number(flags['-n']))
    const g = flags['--graph'] ? '* ' : ''
    for (const c of list) {
      if (flags['--oneline']) {
        this.out(`${g}${this.short(c.id)}${this.decorations(c.id)} ${c.message}`)
      } else {
        this.out(`${g}commit ${c.id}${this.decorations(c.id)}`, 'hint')
        if (c.parents.length > 1) this.out(`Merge: ${c.parents.map((p) => this.short(p)).join(' ')}`)
        this.out(`Author: ${c.author} <${c.author.toLowerCase()}@example.com>\n\n    ${c.message}\n`)
      }
    }
  }

  fileDiff(path: string, a?: string, b?: string) {
    this.out(`diff --git a/${path} b/${path}`, 'info')
    if (a === undefined) this.out('new file')
    if (b === undefined) this.out('deleted file')
    const al = a === undefined ? [] : a.split('\n')
    const bl = b === undefined ? [] : b.split('\n')
    for (const l of al) if (!bl.includes(l)) this.out(`-${l}`, 'err')
    for (const l of bl) if (!al.includes(l)) this.out(`+${l}`, 'ok')
  }

  diff(args: string[]) {
    const { flags, rest } = parseArgs(args, { '--staged': false, '--cached': false, '--stat': false })
    if (rest.length >= 1 && this.tryResolve(rest[0])) {
      const a = this.s.commits[this.resolve(rest[0])].tree
      const b = rest[1] ? this.s.commits[this.resolve(rest[1])].tree : this.s.work
      for (const p of allPaths(a, b)) if (a[p] !== b[p]) this.fileDiff(p, a[p], b[p])
      return
    }
    if (flags['--staged'] || flags['--cached']) {
      const ht = this.headTree()
      for (const p of this.stagedChanges()) if (!rest.length || rest.includes(p)) this.fileDiff(p, ht[p], this.s.index[p])
    } else {
      for (const p of this.unstagedChanges()) if (!rest.length || rest.includes(p)) this.fileDiff(p, this.s.index[p], this.s.work[p])
    }
  }

  show(args: string[]) {
    const id = this.resolve(args.find((a) => !a.startsWith('-')) ?? 'HEAD')
    const c = this.s.commits[id]
    this.out(`commit ${c.id}${this.decorations(c.id)}`, 'hint')
    this.out(`Author: ${c.author} <${c.author.toLowerCase()}@example.com>\n\n    ${c.message}\n`)
    const pt = c.parents[0] ? this.s.commits[c.parents[0]].tree : {}
    for (const p of allPaths(pt, c.tree)) if (pt[p] !== c.tree[p]) this.fileDiff(p, pt[p], c.tree[p])
  }

  branch(args: string[]) {
    const { flags, rest } = parseArgs(args, { '-d': false, '-D': false, '--delete': false, '-m': false, '-M': false, '-a': false, '-r': false, '-v': false, '-vv': false, '--all': false, '-u': true, '--set-upstream-to': true })
    if (flags['-d'] || flags['-D'] || flags['--delete']) {
      if (!rest.length) fail('fatal: branch name required')
      for (const b of rest) {
        if (!(b in this.s.branches)) fail(`error: branch '${b}' not found.`)
        if (this.branchName() === b) fail(`error: cannot delete branch '${b}' used by worktree at '/home/you/project'`)
        const head = this.headId()
        if (!flags['-D'] && head && !this.isAncestor(this.s.branches[b], head)) {
          const up = this.s.upstream[b] && this.s.remoteRefs[this.s.upstream[b]]
          if (!up || !this.isAncestor(this.s.branches[b], up))
            fail(`error: the branch '${b}' is not fully merged.\nhint: If you are sure you want to delete it, run 'git branch -D ${b}'`)
        }
        const id = this.s.branches[b]
        delete this.s.branches[b]
        delete this.s.upstream[b]
        this.out(`Deleted branch ${b} (was ${this.short(id)}).`, 'ok')
      }
      return
    }
    if (flags['-m'] || flags['-M']) {
      const [a, b] = rest.length === 1 ? [this.branchName() ?? fail('fatal: not on a branch'), rest[0]] : rest
      if (!(a! in this.s.branches) && this.branchName() !== a) fail(`error: refname refs/heads/${a} not found`)
      if (b in this.s.branches && !flags['-M']) fail(`fatal: a branch named '${b}' already exists`)
      if (a! in this.s.branches) {
        this.s.branches[b] = this.s.branches[a!]
        delete this.s.branches[a!]
      }
      if (this.s.upstream[a!]) {
        this.s.upstream[b] = this.s.upstream[a!]
        delete this.s.upstream[a!]
      }
      if (this.branchName() === a) this.s.head = { type: 'branch', name: b }
      return
    }
    const up = (flags['-u'] ?? flags['--set-upstream-to']) as string | undefined
    if (up) {
      if (!(up in this.s.remoteRefs)) fail(`error: the requested upstream branch '${up}' does not exist`)
      const b = rest[0] ?? this.branchName() ?? fail('fatal: not on a branch')
      this.s.upstream[b] = up
      return this.out(`branch '${b}' set up to track '${up}'.`, 'ok')
    }
    if (!rest.length) {
      const cur = this.branchName()
      if (this.s.head.type === 'detached') this.out(`* (HEAD detached at ${this.short(this.s.head.id)})`, 'ok')
      for (const b of Object.keys(this.s.branches).sort()) this.out(b === cur ? `* ${b}` : `  ${b}`, b === cur ? 'ok' : 'out')
      if (flags['-a'] || flags['--all'] || flags['-r']) for (const r of Object.keys(this.s.remoteRefs).sort()) this.out(`  remotes/${r}`, 'err')
      return
    }
    const [name, start] = rest
    if (name in this.s.branches) fail(`fatal: a branch named '${name}' already exists`)
    if (!/^[\w./-]+$/.test(name) || name.startsWith('-')) fail(`fatal: '${name}' is not a valid branch name`)
    const id = start ? this.resolve(start) : this.requireCommit()
    this.s.branches[name] = id
  }

  switchTo(target: { branch?: string; id: string }, label: string) {
    const ht = this.headTree()
    const tt = this.s.commits[target.id].tree
    const bad: string[] = []
    for (const p of allPaths(ht, this.s.index, this.s.work)) {
      const dirty = this.s.index[p] !== ht[p] || (p in this.s.index && this.s.work[p] !== this.s.index[p])
      if (dirty && tt[p] !== ht[p]) bad.push(p)
      if (!(p in this.s.index) && p in this.s.work && p in tt && tt[p] !== this.s.work[p]) bad.push(p)
    }
    if (bad.length)
      fail(`error: Your local changes to the following files would be overwritten by checkout:\n\t${bad.join('\n\t')}\nPlease commit your changes or stash them before you switch branches.\nAborting`)
    const ni: Files = { ...tt }
    const nw: Files = { ...tt }
    for (const p of allPaths(ht, this.s.index)) {
      if (this.s.index[p] !== ht[p]) {
        if (p in this.s.index) ni[p] = this.s.index[p]
        else delete ni[p]
      }
    }
    for (const p of allPaths(ht, this.s.work)) {
      if (this.s.work[p] !== ht[p]) {
        if (p in this.s.work) nw[p] = this.s.work[p]
        else delete nw[p]
      }
    }
    const from = this.describeHead()
    this.s.index = ni
    this.s.work = nw
    this.s.head = target.branch ? { type: 'branch', name: target.branch } : { type: 'detached', id: target.id }
    this.s.reflog.unshift({ id: target.id, msg: `${label}: moving from ${from} to ${target.branch ?? this.short(target.id)}` })
  }

  createAndSwitch(name: string, start: string | undefined, label: string) {
    if (name in this.s.branches) fail(`fatal: a branch named '${name}' already exists`)
    const id = start ? this.resolve(start) : this.headId()
    if (!id) {
      // unborn branch: just rename HEAD
      this.s.head = { type: 'branch', name }
      return this.out(`Switched to a new branch '${name}'`, 'ok')
    }
    this.s.branches[name] = id
    this.switchTo({ branch: name, id }, label)
    this.out(`Switched to a new branch '${name}'`, 'ok')
  }

  switchCmd(args: string[]) {
    const { flags, rest } = parseArgs(args, { '-c': true, '-C': true, '--create': true, '--detach': false, '-': false })
    const create = (flags['-c'] ?? flags['-C'] ?? flags['--create']) as string | undefined
    if (create) return this.createAndSwitch(create, rest[0], 'switch')
    const name = rest[0] ?? fail('fatal: missing branch or commit argument')
    if (flags['--detach']) {
      const id = this.resolve(name)
      this.switchTo({ id }, 'checkout')
      return this.out(`HEAD is now at ${this.short(id)} ${this.s.commits[id].message}`, 'hint')
    }
    this.switchBranch(name, 'switch', true)
  }

  switchBranch(name: string, label: string, strict: boolean) {
    if (name === this.branchName()) return this.out(`Already on '${name}'`)
    if (name in this.s.branches) {
      this.switchTo({ branch: name, id: this.s.branches[name] }, label)
      return this.out(`Switched to branch '${name}'`, 'ok')
    }
    // DWIM: create local branch from origin/<name>
    if (`origin/${name}` in this.s.remoteRefs) {
      this.s.branches[name] = this.s.remoteRefs[`origin/${name}`]
      this.s.upstream[name] = `origin/${name}`
      this.switchTo({ branch: name, id: this.s.branches[name] }, label)
      return this.out(`branch '${name}' set up to track 'origin/${name}'.\nSwitched to a new branch '${name}'`, 'ok')
    }
    if (strict) {
      if (this.tryResolve(name)) fail(`fatal: a branch is expected, got commit '${name}'\nhint: If you want to detach HEAD at the commit, try again with the --detach option.`)
      fail(`fatal: invalid reference: ${name}`)
    }
    const id = this.resolve(name)
    this.switchTo({ id }, label)
    this.out(
      `Note: switching to '${name}'.\n\nYou are in 'detached HEAD' state. You can look around, make experimental\nchanges and commit them, and you can discard any commits you make in this\nstate without impacting any branches by switching back to a branch.\n\nIf you want to create a new branch to retain commits you create, you may\ndo so (now or later) by using -c with the switch command. Example:\n\n  git switch -c <new-branch-name>\n\nHEAD is now at ${this.short(id)} ${this.s.commits[id].message}`,
      'hint',
    )
  }

  checkout(args: string[]) {
    const { flags, rest } = parseArgs(args, { '-b': true, '-B': true })
    const create = (flags['-b'] ?? flags['-B']) as string | undefined
    if (create) return this.createAndSwitch(create, rest[0], 'checkout')
    if (args.includes('--') || (rest.length && rest.every((p) => p in this.s.index) && !this.tryResolve(rest[0]) && !(rest[0] in this.s.branches))) {
      return this.restore(rest)
    }
    const name = rest[0] ?? fail('fatal: you must specify a branch or commit')
    this.switchBranch(name, 'checkout', false)
  }

  requireClean(what: string) {
    if (this.isDirty()) fail(`error: Your local changes would be overwritten by ${what}.\nhint: Please commit your changes or stash them before you ${what}.`)
  }

  mergeCmd(args: string[]) {
    const { flags, rest } = parseArgs(args, { '--no-ff': false, '--ff-only': false, '--abort': false, '-m': true, '--squash': false, '--no-edit': false })
    if (flags['--abort']) {
      if (!this.s.merging) fail('fatal: There is no merge to abort (MERGE_HEAD missing).')
      this.s.merging = null
      this.checkoutTree(this.headTree())
      return this.out('Merge aborted. Back to the state before the merge.', 'ok')
    }
    if (this.s.merging) fail('error: Merging is not possible because you have unmerged files.\nhint: Fix them up and commit, or run `git merge --abort`.')
    const name = rest[0] ?? fail('fatal: No remote for the current branch.')
    const theirs = this.resolve(name)
    const ours = this.requireCommit()
    this.requireClean('merge')
    if (this.isAncestor(theirs, ours)) return this.out('Already up to date.')
    if (this.isAncestor(ours, theirs) && !flags['--no-ff']) {
      this.checkoutTree(this.s.commits[theirs].tree)
      this.setHead(theirs, `merge ${name}: Fast-forward`)
      return this.out(`Updating ${this.short(ours)}..${this.short(theirs)}\nFast-forward`, 'ok')
    }
    if (flags['--ff-only']) fail('fatal: Not possible to fast-forward, aborting.')
    const base = this.mergeBase(ours, theirs)
    const { tree, conflicts } = this.merge3(base ? this.s.commits[base].tree : {}, this.headTree(), this.s.commits[theirs].tree, 'HEAD', name)
    const message = (flags['-m'] as string) ?? `Merge ${name in this.s.remoteRefs ? `remote-tracking branch '${name}'` : `branch '${name}'`}${this.branchName() && this.branchName() !== 'main' ? ` into ${this.branchName()}` : ''}`
    if (conflicts.length) {
      this.s.work = { ...this.s.work, ...tree }
      for (const p of Object.keys(this.s.work)) if (!(p in tree) && p in this.s.index) delete this.s.work[p]
      const idx: Files = { ...tree }
      this.s.index = idx
      this.s.merging = { theirs, message, conflicts }
      for (const p of conflicts) {
        this.out(`Auto-merging ${p}`)
        this.out(`CONFLICT (content): Merge conflict in ${p}`, 'err')
      }
      this.out('Automatic merge failed; fix conflicts and then commit the result.', 'err')
      return
    }
    this.checkoutTree(tree)
    const id = this.newCommit([ours, theirs], message, tree)
    this.setHead(id, `merge ${name}: Merge made by the 'ort' strategy.`)
    this.s.fresh = false
    this.out(`Merge made by the 'ort' strategy.`, 'ok')
  }

  /** Replays commits (oldest first) on top of `onto`. Returns new tip. */
  replay(list: string[], onto: string, verb: string): string {
    let tip = onto
    for (const cid of list) {
      const c = this.s.commits[cid]
      const parentTree = c.parents[0] ? this.s.commits[c.parents[0]].tree : {}
      const { tree, conflicts } = this.merge3(parentTree, this.s.commits[tip].tree, c.tree, 'HEAD', this.short(cid))
      if (conflicts.length)
        fail(`error: could not apply ${this.short(cid)}... ${c.message}\nCONFLICT (content): Merge conflict in ${conflicts.join(', ')}\nhint: The simulator stopped the ${verb} and put everything back.\nhint: In real Git you would fix the files, \`git add\` them and run \`git ${verb} --continue\`.`)
      if (sameFiles(tree, this.s.commits[tip].tree)) continue
      tip = this.newCommit([tip], c.message, tree, c.author)
    }
    return tip
  }

  rebase(args: string[]) {
    const { flags, rest } = parseArgs(args, { '-i': false, '--interactive': false, '--continue': false, '--abort': false, '--onto': true })
    if (flags['-i'] || flags['--interactive']) fail('error: interactive rebase needs an editor, which the simulator does not have.\nhint: open the "Interactive rebase" guide, or squash with `git reset --soft HEAD~N` + `git commit`.')
    if (flags['--continue'] || flags['--abort']) fail('fatal: No rebase in progress?')
    const upstreamName = rest[0] ?? (this.branchName() && this.s.upstream[this.branchName()!]) ?? fail('fatal: no upstream configured. Usage: git rebase <branch>')
    const upstream = this.resolve(upstreamName)
    const ours = this.requireCommit()
    this.requireClean('rebase')
    if (this.isAncestor(upstream, ours)) return this.out(`Current branch ${this.describeHead()} is up to date.`)
    if (this.isAncestor(ours, upstream)) {
      this.checkoutTree(this.s.commits[upstream].tree)
      this.setHead(upstream, `rebase: fast-forward to ${upstreamName}`)
      return this.out(`Successfully rebased and updated ${this.describeHead()} (fast-forward).`, 'ok')
    }
    const up = this.ancestors(upstream)
    const list: string[] = []
    let cur: string | undefined = ours
    while (cur && !up.has(cur)) {
      list.unshift(cur)
      cur = this.s.commits[cur].parents[0]
    }
    const tip = this.replay(
      list.filter((c) => this.s.commits[c].parents.length < 2),
      upstream,
      'rebase',
    )
    this.checkoutTree(this.s.commits[tip].tree)
    this.setHead(tip, `rebase (finish): onto ${this.short(upstream)}`)
    this.s.fresh = false
    this.out(`Successfully rebased and updated ${this.branchName() ? `refs/heads/${this.branchName()}` : 'HEAD'}.`, 'ok')
    this.out(`(${list.length} commit${list.length === 1 ? ' was' : 's were'} copied with new IDs — the old ones are only reachable via reflog)`, 'hint')
  }

  cherryPick(args: string[]) {
    const { rest } = parseArgs(args, { '-x': false, '--no-edit': false })
    if (!rest.length) fail('fatal: empty commit set passed')
    this.requireCommit()
    this.requireClean('cherry-pick')
    for (const r of rest) {
      const id = this.resolve(r)
      const tip = this.replay([id], this.requireCommit(), 'cherry-pick')
      if (tip === this.headId()) {
        this.out(`The previous cherry-pick is now empty, possibly due to conflict resolution.`, 'hint')
        continue
      }
      this.checkoutTree(this.s.commits[tip].tree)
      this.setHead(tip, `cherry-pick: ${this.s.commits[id].message}`)
      this.out(`[${this.describeHead()} ${this.short(tip)}] ${this.s.commits[id].message}`, 'ok')
    }
    this.s.fresh = false
  }

  revert(args: string[]) {
    const { rest } = parseArgs(args, { '--no-edit': false, '-n': false, '--no-commit': false })
    if (!rest.length) fail('fatal: empty commit set passed')
    this.requireClean('revert')
    for (const r of rest) {
      const id = this.resolve(r)
      const c = this.s.commits[id]
      if (c.parents.length > 1) fail(`error: commit ${this.short(id)} is a merge but no -m option was given.\nhint: the simulator can only revert normal commits.`)
      const parentTree = c.parents[0] ? this.s.commits[c.parents[0]].tree : {}
      const { tree, conflicts } = this.merge3(c.tree, this.headTree(), parentTree, 'HEAD', `parent of ${this.short(id)}`)
      if (conflicts.length) fail(`error: could not revert ${this.short(id)}... ${c.message}\nCONFLICT in ${conflicts.join(', ')}: later commits changed the same lines.`)
      const msg = `Revert "${c.message}"`
      const nid = this.newCommit([this.requireCommit()], msg, tree)
      this.checkoutTree(tree)
      this.setHead(nid, `revert: ${msg}`)
      this.out(`[${this.describeHead()} ${this.short(nid)}] ${msg}`, 'ok')
    }
    this.s.fresh = false
  }

  reset(args: string[]) {
    const { flags, rest } = parseArgs(args, { '--soft': false, '--mixed': false, '--hard': false, '-q': false })
    const mode = flags['--soft'] ? 'soft' : flags['--hard'] ? 'hard' : 'mixed'
    // `git reset <file>` = unstage
    if (rest.length && !this.tryResolve(rest[0]) && rest.every((p) => p in this.s.index || p in this.headTree())) {
      return this.restore(['--staged', ...rest])
    }
    const target = this.resolve(rest[0] ?? 'HEAD')
    const tree = this.s.commits[target].tree
    if (mode !== 'soft') this.s.index = { ...tree }
    if (mode === 'hard') this.checkoutTree(tree)
    this.s.merging = null
    this.setHead(target, `reset: moving to ${rest[0] ?? 'HEAD'}`)
    if (mode === 'hard') this.out(`HEAD is now at ${this.short(target)} ${this.s.commits[target].message}`, 'ok')
    else if (mode === 'mixed' && this.unstagedChanges().length) {
      this.out('Unstaged changes after reset:')
      for (const p of this.unstagedChanges()) this.out(`M\t${p}`, 'err')
    }
  }

  restore(args: string[]) {
    const { flags, rest } = parseArgs(args, { '--staged': false, '-S': false, '--worktree': false, '-W': false, '--source': true })
    if (!rest.length) fail('fatal: you must specify path(s) to restore')
    const paths = rest.includes('.') ? allPaths(this.s.index, this.headTree(), this.s.work) : rest
    const staged = flags['--staged'] || flags['-S']
    const ht = flags['--source'] ? this.s.commits[this.resolve(flags['--source'] as string)].tree : this.headTree()
    for (const p of paths) {
      if (staged) {
        if (!(p in ht) && !(p in this.s.index)) fail(`error: pathspec '${p}' did not match any file(s) known to git`)
        if (p in ht) this.s.index[p] = ht[p]
        else delete this.s.index[p]
      } else {
        const src = flags['--source'] ? ht : this.s.index
        if (!(p in src)) {
          if (rest.includes('.')) continue
          fail(`error: pathspec '${p}' did not match any file(s) known to git`)
        }
        this.s.work[p] = src[p]
      }
    }
  }

  rmCmd(args: string[]) {
    const { flags, rest } = parseArgs(args, { '--cached': false, '-r': false, '-f': false, '-q': false })
    for (const p of rest) {
      if (!(p in this.s.index)) fail(`fatal: pathspec '${p}' did not match any files`)
      delete this.s.index[p]
      if (!flags['--cached']) delete this.s.work[p]
      this.out(`rm '${p}'`)
    }
  }

  mv(args: string[]) {
    const [a, b] = args
    if (!a || !b) fail('usage: git mv <source> <destination>')
    if (!(a in this.s.index)) fail(`fatal: not under version control, source=${a}, destination=${b}`)
    this.s.index[b] = this.s.index[a]
    delete this.s.index[a]
    this.s.work[b] = this.s.work[a] ?? this.s.index[b]
    delete this.s.work[a]
  }

  stashCmd(args: string[]) {
    const [sub = 'push', ...rest] = args
    const ref = (r?: string) => {
      const n = r ? Number(r.match(/\{(\d+)\}/)?.[1] ?? r) : 0
      if (!this.s.stash[n]) fail(r ? `error: ${r} is not a valid reference` : 'No stash entries found.')
      return n
    }
    if (sub === 'push' || sub === 'save' || sub.startsWith('-')) {
      const { flags } = parseArgs(sub.startsWith('-') ? args : rest, { '-m': true, '--message': true, '-u': false, '--include-untracked': false })
      const base = this.requireCommit()
      const withUntracked = flags['-u'] || flags['--include-untracked']
      if (!this.isDirty() && !(withUntracked && this.untracked().length)) return this.out('No local changes to save')
      const c = this.s.commits[base]
      const m = flags['-m'] ?? flags['--message']
      const message = m ? `On ${this.describeHead()}: ${m}` : `WIP on ${this.describeHead()}: ${this.short(base)} ${c.message}`
      const work: Files = { ...this.s.work }
      if (!withUntracked) for (const p of this.untracked()) delete work[p]
      this.s.stash.unshift({ message, base, index: { ...this.s.index }, work })
      if (withUntracked) for (const p of this.untracked()) delete this.s.work[p]
      this.checkoutTree(c.tree)
      return this.out(`Saved working directory and index state ${message}`, 'ok')
    }
    if (sub === 'list') {
      this.s.stash.forEach((e, i) => this.out(`stash@{${i}}: ${e.message}`))
      return
    }
    if (sub === 'show') {
      const e = this.s.stash[ref(rest[0])]
      const bt = this.s.commits[e.base].tree
      for (const p of allPaths(bt, e.work)) if (bt[p] !== e.work[p]) this.out(` ${p}`)
      return
    }
    if (sub === 'drop') {
      const n = ref(rest[0])
      this.s.stash.splice(n, 1)
      return this.out(`Dropped refs/stash@{${n}}`, 'ok')
    }
    if (sub === 'clear') {
      this.s.stash = []
      return
    }
    if (sub === 'pop' || sub === 'apply') {
      const n = ref(rest[0])
      const e = this.s.stash[n]
      const bt = this.s.commits[e.base].tree
      const { tree, conflicts } = this.merge3(bt, this.s.work, e.work, 'Updated upstream', 'Stashed changes')
      if (conflicts.length) fail(`error: Your local changes to the following files would be overwritten by merge:\n\t${conflicts.join('\n\t')}\nPlease commit your changes or stash them before you merge.\nThe stash entry is kept in case you need it again.`)
      this.s.work = tree
      for (const p of allPaths(bt, e.index)) {
        if (e.index[p] !== bt[p] && p in e.index) this.s.index[p] = e.index[p]
      }
      if (sub === 'pop') {
        this.s.stash.splice(n, 1)
        this.out(`Dropped refs/stash@{${n}}`, 'ok')
      }
      this.out(`Restored: ${e.message}`, 'ok')
      return
    }
    fail(`error: unknown subcommand: ${sub}`)
  }

  tag(args: string[]) {
    const { flags, rest } = parseArgs(args, { '-d': false, '-a': false, '-m': true, '-l': false })
    if (flags['-d']) {
      for (const t of rest) {
        if (!(t in this.s.tags)) fail(`error: tag '${t}' not found.`)
        delete this.s.tags[t]
        this.out(`Deleted tag '${t}'`, 'ok')
      }
      return
    }
    if (!rest.length) {
      for (const t of Object.keys(this.s.tags).sort()) this.out(t)
      return
    }
    const [name, ref] = rest
    if (name in this.s.tags) fail(`fatal: tag '${name}' already exists`)
    this.s.tags[name] = ref ? this.resolve(ref) : this.requireCommit()
  }

  remote(args: string[]) {
    const [sub, ...rest] = args
    if (!sub || sub === '-v') {
      for (const [n, u] of Object.entries(this.s.remotes)) {
        if (sub === '-v') this.out(`${n}\t${u} (fetch)\n${n}\t${u} (push)`)
        else this.out(n)
      }
      return
    }
    if (sub === 'add') {
      const [name, url] = rest
      if (!name || !url) fail('usage: git remote add <name> <url>')
      if (name in this.s.remotes) fail(`error: remote ${name} already exists.`)
      this.s.remotes[name] = url
      if (!this.s.servers[url]) this.s.servers[url] = { branches: {}, tags: {} }
      return
    }
    if (sub === 'remove' || sub === 'rm') {
      const name = rest[0]
      if (!(name in this.s.remotes)) fail(`error: No such remote: '${name}'`)
      delete this.s.remotes[name]
      for (const r of Object.keys(this.s.remoteRefs)) if (r.startsWith(`${name}/`)) delete this.s.remoteRefs[r]
      return
    }
    if (sub === 'set-url') {
      const [name, url] = rest
      if (!(name in this.s.remotes)) fail(`error: No such remote '${name}'`)
      this.s.remotes[name] = url
      if (!this.s.servers[url]) this.s.servers[url] = { branches: {}, tags: {} }
      return
    }
    fail(`error: unknown subcommand: ${sub}`)
  }

  server(remote = 'origin'): Server {
    const url = this.s.remotes[remote]
    if (!url) fail(`fatal: '${remote}' does not appear to be a git repository\nfatal: Could not read from remote repository.\nhint: add one with \`git remote add ${remote} <url>\`.`)
    return this.s.servers[url!]
  }

  push(args: string[]) {
    const { flags, rest } = parseArgs(args, { '-u': false, '--set-upstream': false, '-f': false, '--force': false, '--force-with-lease': false, '--all': false, '--tags': false, '--delete': false, '-d': false })
    const remoteName = rest[0] ?? 'origin'
    if (!Object.keys(this.s.remotes).length) fail('fatal: No configured push destination.\nhint: add one with `git remote add origin <url>`, then `git push -u origin main`.')
    const srv = this.server(remoteName)
    const force = flags['-f'] || flags['--force']
    const lease = flags['--force-with-lease']
    if (flags['--delete'] || flags['-d']) {
      for (const b of rest.slice(1)) {
        if (!(b in srv.branches)) fail(`error: unable to delete '${b}': remote ref does not exist`)
        delete srv.branches[b]
        delete this.s.remoteRefs[`${remoteName}/${b}`]
        this.out(` - [deleted]         ${b}`, 'ok')
      }
      return
    }
    if (flags['--tags']) {
      for (const [t, id] of Object.entries(this.s.tags)) {
        if (srv.tags[t] === id) continue
        if (srv.tags[t] && !force) {
          this.out(` ! [rejected]        ${t} -> ${t} (already exists)`, 'err')
          continue
        }
        srv.tags[t] = id
        this.out(` * [new tag]         ${t} -> ${t}`, 'ok')
      }
      if (!rest.slice(1).length && !flags['--all']) return
    }
    let names: string[]
    if (flags['--all']) names = Object.keys(this.s.branches)
    else if (rest[1]) names = rest.slice(1)
    else {
      const b = this.branchName() ?? fail('fatal: You are not currently on a branch.')
      if (!this.s.upstream[b!] && !(flags['-u'] || flags['--set-upstream']))
        fail(`fatal: The current branch ${b} has no upstream branch.\nTo push the current branch and set the remote as upstream, use\n\n    git push --set-upstream ${remoteName} ${b}\n\nhint: or the short form: git push -u ${remoteName} ${b}`)
      names = [b!]
    }
    this.out(`To ${this.s.remotes[remoteName]}`)
    let rejected = false
    for (const spec of names) {
      const [src, dst = src] = spec.split(':')
      const local = this.s.branches[src] ?? this.tryResolve(src)
      if (!local) fail(`error: src refspec ${src} does not match any`)
      const remoteId = srv.branches[dst]
      const trackRef = `${remoteName}/${dst}`
      if (remoteId === local) {
        this.out('Everything up-to-date')
      } else if (!remoteId) {
        srv.branches[dst] = local!
        this.out(` * [new branch]      ${src} -> ${dst}`, 'ok')
      } else if (this.isAncestor(remoteId, local!)) {
        srv.branches[dst] = local!
        this.out(`   ${this.short(remoteId)}..${this.short(local!)}  ${src} -> ${dst}`, 'ok')
      } else if (lease) {
        if (this.s.remoteRefs[trackRef] !== remoteId) {
          this.out(` ! [rejected]        ${src} -> ${dst} (stale info)`, 'err')
          this.out(`hint: someone pushed to '${dst}' since your last fetch — --force-with-lease protected their work.\nhint: run \`git fetch\`, look at their commits, then decide.`, 'hint')
          rejected = true
          continue
        }
        srv.branches[dst] = local!
        this.out(` + ${this.short(remoteId)}...${this.short(local!)} ${src} -> ${dst} (forced update)`, 'ok')
      } else if (force) {
        const lost = [...this.ancestors(remoteId)].filter((c) => !this.ancestors(local!).has(c)).length
        srv.branches[dst] = local!
        this.out(` + ${this.short(remoteId)}...${this.short(local!)} ${src} -> ${dst} (forced update)`, 'ok')
        if (lost) this.out(`warning: ${lost} commit${lost > 1 ? 's' : ''} on the remote ${lost > 1 ? 'are' : 'is'} no longer on '${dst}'. If a teammate made them, their work is gone from the branch.`, 'hint')
      } else {
        this.out(` ! [rejected]        ${src} -> ${dst} (fetch first)`, 'err')
        this.out(`error: failed to push some refs to '${this.s.remotes[remoteName]}'\nhint: Updates were rejected because the remote contains work that you do not\nhint: have locally. Integrate the remote changes (e.g. 'git pull ...')\nhint: before pushing again.`, 'hint')
        rejected = true
        continue
      }
      this.s.remoteRefs[trackRef] = srv.branches[dst]
      if ((flags['-u'] || flags['--set-upstream']) && src in this.s.branches) {
        this.s.upstream[src] = trackRef
        this.out(`branch '${src}' set up to track '${trackRef}'.`, 'ok')
      }
    }
    if (rejected) fail('error: failed to push some refs')
  }

  fetch(args: string[]) {
    const { rest } = parseArgs(args, { '--all': false, '--prune': false, '-p': false, '--tags': false })
    const remotes = rest[0] ? [rest[0]] : Object.keys(this.s.remotes)
    if (!remotes.length) fail('fatal: No remote repository specified.')
    for (const r of remotes) {
      const srv = this.server(r)
      let printed = false
      for (const [b, id] of Object.entries(srv.branches)) {
        const ref = `${r}/${b}`
        const old = this.s.remoteRefs[ref]
        if (old === id) continue
        if (!printed) this.out(`From ${this.s.remotes[r]}`)
        printed = true
        if (!old) this.out(` * [new branch]      ${b} -> ${ref}`, 'ok')
        else if (this.isAncestor(old, id)) this.out(`   ${this.short(old)}..${this.short(id)}  ${b} -> ${ref}`, 'ok')
        else this.out(` + ${this.short(old)}...${this.short(id)} ${b} -> ${ref}  (forced update)`, 'hint')
        this.s.remoteRefs[ref] = id
      }
      for (const ref of Object.keys(this.s.remoteRefs)) {
        if (ref.startsWith(`${r}/`) && !(ref.slice(r.length + 1) in srv.branches)) delete this.s.remoteRefs[ref]
      }
      for (const [t, id] of Object.entries(srv.tags)) if (!(t in this.s.tags)) this.s.tags[t] = id
    }
  }

  pull(args: string[]) {
    const { flags, rest } = parseArgs(args, { '--rebase': false, '-r': false, '--ff-only': false, '--no-rebase': false })
    const b = this.branchName() ?? fail('fatal: You are not currently on a branch.')
    let remote = rest[0]
    let rb = rest[1]
    if (!remote) {
      const up = this.s.upstream[b!]
      if (!up) fail(`There is no tracking information for the current branch.\nPlease specify which branch you want to merge with.\n\n    git pull origin ${b}\n\nIf you wish to set tracking information for this branch you can do so with:\n\n    git branch --set-upstream-to=origin/${b} ${b}`)
      ;[remote, rb] = up!.split('/')
    }
    this.fetch([remote])
    const ref = `${remote}/${rb ?? b}`
    if (!(ref in this.s.remoteRefs)) fail(`fatal: couldn't find remote ref ${rb ?? b}`)
    if (!this.headId()) {
      this.s.branches[b!] = this.s.remoteRefs[ref]
      this.checkoutTree(this.s.commits[this.s.remoteRefs[ref]].tree)
      return
    }
    if (flags['--rebase'] || flags['-r']) return this.rebase([ref])
    if (flags['--ff-only'] && !this.isAncestor(this.requireCommit(), this.s.remoteRefs[ref]) && !this.isAncestor(this.s.remoteRefs[ref], this.requireCommit()))
      fail('fatal: Not possible to fast-forward, aborting.')
    this.mergeCmd([ref])
  }

  reflogCmd() {
    this.s.reflog.slice(0, 30).forEach((e, i) => {
      if (this.s.commits[e.id]) this.out(`${this.short(e.id)} HEAD@{${i}}: ${e.msg}`)
    })
  }

  filterRepo(args: string[]) {
    const { flags } = parseArgs(args, { '--invert-paths': false, '--path': false, '--force': false, '--replace-text': true })
    const paths: string[] = []
    args.forEach((a, i) => {
      if (a === '--path' && args[i + 1]) paths.push(args[i + 1])
    })
    if (!paths.length) fail('error: the simulator supports `git filter-repo --invert-paths --path <file> [--path <file2>] [--force]`')
    if (!flags['--invert-paths']) fail('hint: without --invert-paths, filter-repo would KEEP only these paths and delete everything else.\nhint: to remove a file from history use --invert-paths.')
    if (!this.s.fresh && !flags['--force'])
      fail('Aborting: Refusing to destructively overwrite repo history since\nthis does not look like a fresh clone.\n  (expected freshly packed repo)\nPlease operate on a fresh clone instead.  If you want to proceed\nanyway, use --force.')
    const starts = [...Object.values(this.s.branches), ...Object.values(this.s.tags), ...(this.headId() ? [this.headId()!] : [])]
    const all = this.reachable(starts).reverse() // oldest first
    const map: Record<string, string> = {}
    let removed = 0
    for (const c of all) {
      const tree: Files = { ...c.tree }
      for (const p of paths) delete tree[p]
      const parents = [...new Set(c.parents.map((p) => map[p]).filter(Boolean))]
      const pt = parents[0] ? this.s.commits[parents[0]].tree : {}
      if (parents.length <= 1 && c.parents.length <= 1 && sameFiles(tree, pt) && !sameFiles(c.tree, c.parents[0] ? this.s.commits[c.parents[0]].tree : {}) && parents[0]) {
        map[c.id] = parents[0] // commit became empty → pruned
        removed++
        continue
      }
      this.s.seq++
      const id = hash(`filtered|${c.id}|${parents.join(',')}|${this.s.seq}`)
      this.s.commits[id] = { id, parents, message: c.message, tree, seq: this.s.seq, author: c.author }
      map[c.id] = id
    }
    for (const b of Object.keys(this.s.branches)) this.s.branches[b] = map[this.s.branches[b]]
    for (const t of Object.keys(this.s.tags)) this.s.tags[t] = map[this.s.tags[t]]
    if (this.s.head.type === 'detached') this.s.head = { type: 'detached', id: map[this.s.head.id] }
    const hadOrigin = 'origin' in this.s.remotes
    delete this.s.remotes.origin
    this.s.remoteRefs = {}
    this.s.upstream = {}
    this.s.reflog = []
    this.s.stash = []
    const keep: Files = {}
    for (const p of this.untracked()) keep[p] = this.s.work[p]
    this.s.index = { ...this.headTree() }
    this.s.work = { ...this.headTree(), ...keep }
    this.s.fresh = false
    this.out(`Parsed ${all.length} commits\nNew history written; ${all.length - removed} commits kept${removed ? `, ${removed} now-empty commit${removed > 1 ? 's' : ''} pruned` : ''}.\nCompletely finished after 0.05 seconds.`, 'ok')
    this.out(`Every commit ID changed. Removed from all history: ${paths.join(', ')}`, 'hint')
    if (hadOrigin)
      this.out("NOTICE: Removing 'origin' remote; see 'Why is my origin removed?'\n        in the manual if you want to push back there.\nhint: add it again with `git remote add origin <url>`, then `git push --force --all`.", 'hint')
  }

  teammate(args: string[]) {
    const [sub, msg, file] = args
    if (sub !== 'push' || !msg) fail('usage: teammate push "message" [file]  — simulates a teammate pushing a commit to origin')
    const srv = this.server('origin')
    const b = this.branchName() ?? 'main'
    const base = srv.branches[b]
    if (!base) fail(`teammate: origin has no '${b}' branch yet — push it first (git push -u origin ${b}).`)
    const tree = { ...this.s.commits[base].tree }
    const f = file ?? 'teammate.txt'
    tree[f] = tree[f] ? `${tree[f]}\n${msg}` : msg
    const id = this.newCommit([base], msg, tree, 'Teammate')
    srv.branches[b] = id
    this.out(`(a teammate pushed "${msg}" to origin/${b} — run \`git fetch\` to see it)`, 'info')
  }
}

const HELP = `Git Compass simulator — supported commands
  shell:  ls  cat  touch  rm  echo "text" > file  echo "text" >> file  clear
  setup:  git init  git clone <url>  git config ...
  save:   git status  git add  git commit [-m|-a|--amend]  git rm  git mv
  look:   git log [--oneline --graph --all]  git show  git diff [--staged]  git reflog
  branch: git branch  git switch [-c]  git checkout [-b]  git merge  git rebase
  undo:   git restore [--staged]  git reset [--soft|--mixed|--hard]  git revert  git cherry-pick
  stash:  git stash [push -m|list|pop|apply|drop]
  share:  git remote add  git push [-u|--force-with-lease]  git fetch  git pull [--rebase]  git tag
  history rewrite:  git filter-repo --invert-paths --path <file>
  extra:  teammate push "message" [file]   (simulate a teammate's push)`

// ---------------------------------------------------------------- public API

export function runCommand(state: RepoState, input: string): RunResult {
  const repo = new Repo(state)
  const trimmed = input.trim()
  try {
    repo.run(trimmed)
    return { state: repo.s, lines: repo.lines, clear: repo.clear }
  } catch (e) {
    if (e instanceof GitError) {
      // failed commands keep their partial output but never change state
      const lines = [...repo.lines, ...e.message.split('\n').map((text) => ({ kind: (text.startsWith('hint') ? 'hint' : 'err') as Line['kind'], text }))]
      return { state, lines, failed: true }
    }
    throw e
  }
}

/** Runs a list of commands, returns the final state (used for setups and tests). */
export function runAll(cmds: string[], state: RepoState = emptyState()) {
  let s = state
  const lines: Line[] = []
  for (const c of cmds) {
    const r = runCommand(s, c)
    s = r.state
    lines.push({ kind: 'cmd', text: c }, ...r.lines)
  }
  return { state: s, lines }
}

/** Read-only helpers for UI and challenge checks. */
export function inspect(state: RepoState) {
  return new Repo(state)
}
