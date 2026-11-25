import { describe, expect, it } from 'vitest'
import {
  EXAMPLE_LOG,
  groupBySection,
  nextVersion,
  normaliseRepoUrl,
  parseCommits,
  parseLine,
  renderChangelog,
  renderPrDescription,
  renderReleaseNotes,
  suggestBump,
} from './changelog'

describe('parseLine', () => {
  it('reads git log --oneline with decorations, scope and PR number', () => {
    const c = parseLine('a1b2c3d (HEAD -> main, origin/main) feat(auth): add sign in with email code (#42)')!
    expect(c).toMatchObject({ hash: 'a1b2c3d', type: 'feat', scope: 'auth', subject: 'Add sign in with email code', pr: 42, section: 'features', conventional: true, breaking: false })
  })

  it('reads tag decorations', () => {
    expect(parseLine('9f8e7d6 (tag: v1.2.0) fix: crash on start')!.subject).toBe('Crash on start')
  })

  it('marks "!" and BREAKING CHANGE as breaking', () => {
    expect(parseLine('feat!: drop Node 18')).toMatchObject({ breaking: true, section: 'breaking' })
    expect(parseLine('refactor(api): new auth flow BREAKING CHANGE tokens renamed')).toMatchObject({ breaking: true })
  })

  it('guesses the type of plain commit messages from the first word', () => {
    expect(parseLine('Add CSV export')!.section).toBe('features')
    expect(parseLine('Fixed login redirect')!.section).toBe('fixes')
    expect(parseLine('Remove old API')!.section).toBe('removed')
    expect(parseLine('Update README')!.section).toBe('docs')
    expect(parseLine('Bump vite to 6.3')!.section).toBe('chores')
    expect(parseLine('Refactor the store')!.section).toBe('changed')
    expect(parseLine('Hello world')!.section).toBe('other')
    expect(parseLine('Add CSV export')!.conventional).toBe(false)
  })

  it('skips plain merge commits unless asked, but keeps GitHub PR merges that carry a title', () => {
    expect(parseLine("Merge branch 'main' into feature")).toBeNull()
    expect(parseLine("Merge branch 'main' into feature", { includeMerges: true })).not.toBeNull()
    expect(parseLine('Merge pull request #39 from team/fix-dark-mode')).toBeNull()
    expect(parseLine('Merge pull request #39 from team/fix-dark-mode Fix dark mode')).toMatchObject({ pr: 39, subject: 'Fix dark mode' })
  })

  it('collects closed issues and cleans the subject', () => {
    const c = parseLine('- fix: wrong total in cart, closes #12 and fixes #15.')!
    expect(c.closes).toEqual([12, 15])
    expect(c.subject).toBe('Wrong total in cart')
  })

  it('ignores blank lines and comments, and does not treat words as hashes', () => {
    expect(parseLine('   ')).toBeNull()
    expect(parseLine('# notes')).toBeNull()
    expect(parseLine('feedbac fix: x')!.hash).toBeUndefined()
  })
})

describe('parseCommits', () => {
  it('parses the example and removes duplicates', () => {
    const list = parseCommits(EXAMPLE_LOG + '\n' + EXAMPLE_LOG)
    expect(list.length).toBe(11) // 12 lines, one bare merge commit skipped
    expect(groupBySection(list).map((g) => g.section.id)).toEqual(['breaking', 'features', 'fixes', 'performance', 'changed', 'removed', 'docs', 'build', 'chores'])
  })
})

describe('versions', () => {
  it('suggests a semver bump', () => {
    expect(suggestBump(parseCommits('fix: a'))).toBe('patch')
    expect(suggestBump(parseCommits('fix: a\nfeat: b'))).toBe('minor')
    expect(suggestBump(parseCommits('feat!: b'))).toBe('major')
  })

  it('computes the next version and keeps the v prefix', () => {
    expect(nextVersion('v1.4.2', 'patch')).toBe('v1.4.3')
    expect(nextVersion('1.4.2', 'minor')).toBe('1.5.0')
    expect(nextVersion('v1.4.2', 'major')).toBe('v2.0.0')
    expect(nextVersion('0.3.1', 'major')).toBe('0.4.0')
    expect(nextVersion('latest', 'patch')).toBe('')
  })
})

describe('normaliseRepoUrl', () => {
  it('accepts https, ssh and owner/repo', () => {
    for (const u of ['https://github.com/me/app', 'https://github.com/me/app.git', 'git@github.com:me/app.git', 'me/app', 'github.com/me/app/']) {
      expect(normaliseRepoUrl(u)).toBe('https://github.com/me/app')
    }
    expect(normaliseRepoUrl('https://example.com/x')).toBeUndefined()
  })
})

describe('renderers', () => {
  const commits = parseCommits(EXAMPLE_LOG)
  const opts = { repoUrl: 'me/app', version: 'v2.0.0', previousVersion: 'v1.4.2', date: '2026-11-25' }

  it('renders a Keep a Changelog section with links', () => {
    const md = renderChangelog(commits, opts)
    expect(md.startsWith('## [2.0.0] - 2026-11-25')).toBe(true)
    expect(md).toContain('### Added')
    expect(md).toContain('- **auth:** Add sign in with email code ([#42](https://github.com/me/app/pull/42), [`a1b2c3d`](https://github.com/me/app/commit/a1b2c3d))')
    expect(md).toContain('[2.0.0]: https://github.com/me/app/compare/v1.4.2...v2.0.0')
  })

  it('renders Unreleased without a version', () => {
    expect(renderChangelog(parseCommits('fix: a')).startsWith('## [Unreleased]')).toBe(true)
  })

  it('hides sections', () => {
    expect(renderChangelog(commits, { hidden: ['chores', 'build'] })).not.toContain('### Chores')
  })

  it('renders a PR description with summary, breaking changes, checklist and Closes lines', () => {
    const md = renderPrDescription(commits, { title: 'Email sign-in' })
    expect(md).toContain('# Email sign-in')
    expect(md).toMatch(/This PR adds 2 features, fixes 2 bugs, includes \d+ other changes and has 1 breaking change\./)
    expect(md).toContain('## ⚠️ Breaking changes')
    expect(md).toContain('- [ ] Tests added or updated')
    expect(md).toContain('Closes #37')
  })

  it('renders release notes with a full changelog link', () => {
    const md = renderReleaseNotes(commits, opts)
    expect(md.startsWith('## v2.0.0 (2026-11-25)')).toBe(true)
    expect(md).toContain('### ✨ New')
    expect(md).toContain('**Full changelog:** https://github.com/me/app/compare/v1.4.2...v2.0.0')
    expect(md).not.toContain('**auth:**')
  })
})
