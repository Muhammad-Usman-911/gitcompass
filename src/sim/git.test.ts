import { describe, expect, it } from 'vitest'
import { emptyState, inspect, runAll, runCommand } from './git'

const base = ['git init', 'echo "hello" > a.txt', 'git add .', 'git commit -m "First"']

function errors(lines: { kind: string; text: string }[]) {
  return lines.filter((l) => l.kind === 'err').map((l) => l.text)
}

describe('basics', () => {
  it('needs a repo', () => {
    const r = runCommand(emptyState(), 'git status')
    expect(errors(r.lines)[0]).toMatch(/not a git repository/)
  })

  it('stages and commits', () => {
    const { state } = runAll(base)
    const repo = inspect(state)
    expect(Object.keys(state.commits)).toHaveLength(1)
    expect(state.branches.main).toBeDefined()
    expect(repo.isDirty()).toBe(false)
  })

  it('reports nothing to commit and leaves state untouched on error', () => {
    const { state } = runAll(base)
    const r = runCommand(state, 'git commit -m "again"')
    expect(errors(r.lines).join()).toMatch(/nothing to commit/)
    expect(r.state).toBe(state)
  })

  it('commit -am stages tracked changes only', () => {
    const { state } = runAll([...base, 'echo "more" >> a.txt', 'touch new.txt', 'git commit -am "Second"'])
    const repo = inspect(state)
    expect(repo.headTree()['a.txt']).toBe('hello\nmore')
    expect(repo.untracked()).toEqual(['new.txt'])
  })

  it('amend replaces the commit', () => {
    const { state } = runAll([...base, 'git commit --amend -m "Better"'])
    const repo = inspect(state)
    expect(state.commits[repo.headId()!].message).toBe('Better')
    expect(state.commits[repo.headId()!].parents).toEqual([])
  })

  it('resolves HEAD~n and short ids', () => {
    const { state } = runAll([...base, 'echo 2 > a.txt', 'git commit -am "2"', 'echo 3 > a.txt', 'git commit -am "3"'])
    const repo = inspect(state)
    const first = repo.resolve('HEAD~2')
    expect(state.commits[first].message).toBe('First')
    expect(repo.resolve(first.slice(0, 5))).toBe(first)
  })
})

describe('branches and merges', () => {
  it('fast-forward merge', () => {
    const { state } = runAll([...base, 'git switch -c feat', 'echo x > b.txt', 'git add .', 'git commit -m "B"', 'git switch main', 'git merge feat'])
    expect(state.branches.main).toBe(state.branches.feat)
  })

  it('three-way merge creates a merge commit', () => {
    const { state } = runAll([
      ...base,
      'git switch -c feat',
      'echo x > b.txt',
      'git add .',
      'git commit -m "B"',
      'git switch main',
      'echo y > c.txt',
      'git add .',
      'git commit -m "C"',
      'git merge feat',
    ])
    const head = state.commits[state.branches.main]
    expect(head.parents).toHaveLength(2)
    expect(Object.keys(head.tree).sort()).toEqual(['a.txt', 'b.txt', 'c.txt'])
  })

  it('conflicts and resolution', () => {
    const { state, lines } = runAll([
      ...base,
      'git switch -c feat',
      'echo "feat" > a.txt',
      'git commit -am "feat edit"',
      'git switch main',
      'echo "main" > a.txt',
      'git commit -am "main edit"',
      'git merge feat',
    ])
    expect(lines.some((l) => l.text.includes('CONFLICT'))).toBe(true)
    expect(state.merging?.conflicts).toEqual(['a.txt'])
    expect(state.work['a.txt']).toContain('<<<<<<< HEAD')
    const blocked = runCommand(state, 'git commit -m "x"')
    expect(errors(blocked.lines).join()).toMatch(/unmerged/)
    const done = runAll(['echo "both" > a.txt', 'git add a.txt', 'git commit -m "Merge"'], state).state
    expect(done.merging).toBeNull()
    expect(done.commits[done.branches.main].parents).toHaveLength(2)
  })

  it('refuses to switch with conflicting local changes', () => {
    const { state } = runAll([...base, 'git switch -c feat', 'echo f > a.txt', 'git commit -am "f"', 'git switch main', 'echo dirty > a.txt'])
    const r = runCommand(state, 'git switch feat')
    expect(errors(r.lines).join()).toMatch(/would be overwritten/)
  })

  it('carries non-conflicting changes across a switch', () => {
    const { state } = runAll([...base, 'git branch feat', 'echo wip > new.txt', 'git switch feat'])
    expect(state.work['new.txt']).toBe('wip')
  })

  it('rebase replays commits with new ids', () => {
    const { state } = runAll([
      ...base,
      'git switch -c feat',
      'echo x > b.txt',
      'git add .',
      'git commit -m "B"',
      'git switch main',
      'echo y > c.txt',
      'git add .',
      'git commit -m "C"',
      'git switch feat',
    ])
    const oldFeat = state.branches.feat
    const after = runCommand(state, 'git rebase main').state
    expect(after.branches.feat).not.toBe(oldFeat)
    const repo = inspect(after)
    expect(repo.isAncestor(after.branches.main, after.branches.feat)).toBe(true)
    expect(after.commits[after.branches.feat].parents).toEqual([after.branches.main])
  })

  it('branch -d refuses unmerged work, -D forces', () => {
    const { state } = runAll([...base, 'git switch -c feat', 'echo x > b.txt', 'git add .', 'git commit -m "B"', 'git switch main'])
    expect(errors(runCommand(state, 'git branch -d feat').lines).join()).toMatch(/not fully merged/)
    expect(runCommand(state, 'git branch -D feat').state.branches.feat).toBeUndefined()
  })

  it('detached HEAD', () => {
    const { state } = runAll([...base, 'echo 2 > a.txt', 'git commit -am "2"', 'git checkout HEAD~1'])
    expect(state.head.type).toBe('detached')
  })
})

describe('undo', () => {
  const two = [...base, 'echo 2 >> a.txt', 'git commit -am "Second"']

  it('reset --soft keeps changes staged', () => {
    const { state } = runAll([...two, 'git reset --soft HEAD~1'])
    const repo = inspect(state)
    expect(repo.stagedChanges()).toEqual(['a.txt'])
  })

  it('reset --mixed keeps changes unstaged', () => {
    const { state } = runAll([...two, 'git reset HEAD~1'])
    const repo = inspect(state)
    expect(repo.stagedChanges()).toEqual([])
    expect(repo.unstagedChanges()).toEqual(['a.txt'])
  })

  it('reset --hard discards changes; reflog recovers', () => {
    const { state } = runAll([...two, 'git reset --hard HEAD~1'])
    expect(state.work['a.txt']).toBe('hello')
    const lost = state.reflog[1].id
    const back = runCommand(state, `git reset --hard ${lost}`).state
    expect(back.work['a.txt']).toBe('hello\n2')
  })

  it('revert makes an inverse commit', () => {
    const { state } = runAll([...two, 'git revert HEAD --no-edit'])
    expect(state.work['a.txt']).toBe('hello')
    expect(state.commits[state.branches.main].message).toBe('Revert "Second"')
  })

  it('restore and restore --staged', () => {
    const { state } = runAll([...base, 'echo bad > a.txt', 'git add a.txt', 'git restore --staged a.txt', 'git restore a.txt'])
    expect(state.work['a.txt']).toBe('hello')
    expect(inspect(state).isDirty()).toBe(false)
  })

  it('stash and pop', () => {
    const { state } = runAll([...base, 'echo wip >> a.txt', 'git stash'])
    expect(state.work['a.txt']).toBe('hello')
    expect(state.stash).toHaveLength(1)
    const popped = runCommand(state, 'git stash pop').state
    expect(popped.work['a.txt']).toBe('hello\nwip')
    expect(popped.stash).toHaveLength(0)
  })

  it('cherry-pick copies a commit', () => {
    const { state } = runAll([...base, 'git switch -c feat', 'echo fix > fix.txt', 'git add .', 'git commit -m "Fix"', 'git switch main', 'git cherry-pick feat'])
    expect(state.work['fix.txt']).toBe('fix')
    expect(state.branches.main).not.toBe(state.branches.feat)
  })

  it('rm --cached untracks but keeps file', () => {
    const { state } = runAll([...base, 'git rm --cached a.txt', 'git commit -m "untrack"'])
    expect(state.work['a.txt']).toBe('hello')
    expect(inspect(state).headTree()['a.txt']).toBeUndefined()
  })
})

describe('remotes', () => {
  const url = 'https://github.com/you/app.git'

  it('push needs a remote and upstream', () => {
    const { state } = runAll(base)
    expect(errors(runCommand(state, 'git push').lines).join()).toMatch(/No configured push destination/)
    const withRemote = runCommand(state, `git remote add origin ${url}`).state
    expect(errors(runCommand(withRemote, 'git push').lines).join()).toMatch(/no upstream/)
    const pushed = runCommand(withRemote, 'git push -u origin main').state
    expect(pushed.servers[url].branches.main).toBe(pushed.branches.main)
    expect(pushed.upstream.main).toBe('origin/main')
  })

  it('rejects non-fast-forward, force-with-lease protects, pull merges', () => {
    const { state } = runAll([...base, `git remote add origin ${url}`, 'git push -u origin main', 'teammate push "Their work"', 'echo mine > m.txt', 'git add .', 'git commit -m "Mine"'])
    const rejected = runCommand(state, 'git push')
    expect(rejected.lines.some((l) => l.text.includes('[rejected]'))).toBe(true)
    const lease = runCommand(state, 'git push --force-with-lease')
    expect(lease.lines.some((l) => l.text.includes('stale info'))).toBe(true)
    const pulled = runAll(['git pull', 'git push'], state).state
    const repo = inspect(pulled)
    expect(pulled.work['teammate.txt']).toBe('Their work')
    expect(pulled.servers[url].branches.main).toBe(repo.headId())
  })

  it('clone gives history and tracking', () => {
    const { state } = runAll([`git clone ${url}`])
    expect(Object.keys(state.commits)).toHaveLength(3)
    expect(state.upstream.main).toBe('origin/main')
    expect(state.fresh).toBe(true)
  })

  it('fetch updates remote-tracking refs only', () => {
    const { state } = runAll([`git clone ${url}`, 'teammate push "x"', 'git fetch'])
    expect(state.remoteRefs['origin/main']).not.toBe(state.branches.main)
  })
})

describe('history rewrite', () => {
  it('filter-repo removes a file from every commit and drops origin', () => {
    const url = 'https://github.com/you/app.git'
    const { state } = runAll([
      `git clone ${url}`,
      'echo "API_KEY=123" > secret.txt',
      'git add .',
      'git commit -m "Add config"',
      'echo "more" >> README.md',
      'git commit -am "Docs"',
      'git push',
    ])
    const refused = runCommand(state, 'git filter-repo --invert-paths --path secret.txt')
    expect(errors(refused.lines).join()).toMatch(/fresh clone/)
    const { state: clean } = runAll(['git filter-repo --invert-paths --path secret.txt --force'], state)
    const repo = inspect(clean)
    for (const c of repo.reachable([repo.headId()!])) expect(c.tree['secret.txt']).toBeUndefined()
    expect(clean.remotes.origin).toBeUndefined()
    expect(clean.work['secret.txt']).toBeUndefined()
    // the "Add config" commit only added the secret → pruned
    expect(repo.reachable([repo.headId()!]).map((c) => c.message)).not.toContain('Add config')
    const pushed = runAll([`git remote add origin ${url}`, 'git push --force --all'], clean).state
    expect(pushed.servers[url].branches.main).toBe(clean.branches.main)
  })
})
