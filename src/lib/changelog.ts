// Changelog & PR writer: turns pasted commit messages into a grouped changelog,
// a pull request description or release notes. Pure functions, no network: it all
// runs in the browser.

export type SectionId =
  | 'breaking'
  | 'features'
  | 'fixes'
  | 'performance'
  | 'changed'
  | 'removed'
  | 'security'
  | 'docs'
  | 'tests'
  | 'build'
  | 'chores'
  | 'other'

export interface Commit {
  /** Short or full hash when the line had one. */
  hash?: string
  /** Conventional type as written (`feat`, `fix`…) or inferred from the first word. */
  type: string
  scope?: string
  breaking: boolean
  /** Cleaned, capitalised subject without type/scope/PR suffix. */
  subject: string
  /** PR number from a "(#123)" suffix or a GitHub merge commit. */
  pr?: number
  /** Issues closed by this commit ("closes #12", "fixes #3"). */
  closes: number[]
  section: SectionId
  /** true when the type came from a Conventional Commit prefix, false when it was guessed. */
  conventional: boolean
  raw: string
}

export interface SectionInfo {
  id: SectionId
  /** Heading in a Keep a Changelog file. */
  changelog: string
  /** Heading in friendly release notes / PR descriptions. */
  friendly: string
}

export const SECTIONS: SectionInfo[] = [
  { id: 'breaking', changelog: '⚠ Breaking changes', friendly: '⚠️ Breaking changes' },
  { id: 'features', changelog: 'Added', friendly: '✨ New' },
  { id: 'fixes', changelog: 'Fixed', friendly: '🐛 Fixes' },
  { id: 'security', changelog: 'Security', friendly: '🔒 Security' },
  { id: 'performance', changelog: 'Performance', friendly: '⚡ Faster' },
  { id: 'changed', changelog: 'Changed', friendly: '🔧 Changed' },
  { id: 'removed', changelog: 'Removed', friendly: '🗑️ Removed' },
  { id: 'docs', changelog: 'Documentation', friendly: '📝 Docs' },
  { id: 'tests', changelog: 'Tests', friendly: '✅ Tests' },
  { id: 'build', changelog: 'Build & CI', friendly: '🏗️ Build & CI' },
  { id: 'chores', changelog: 'Chores', friendly: '🧹 Chores' },
  { id: 'other', changelog: 'Other', friendly: '📦 Other' },
]

const TYPE_SECTION: Record<string, SectionId> = {
  feat: 'features',
  feature: 'features',
  fix: 'fixes',
  bugfix: 'fixes',
  hotfix: 'fixes',
  perf: 'performance',
  refactor: 'changed',
  style: 'changed',
  revert: 'changed',
  docs: 'docs',
  doc: 'docs',
  test: 'tests',
  tests: 'tests',
  build: 'build',
  ci: 'build',
  chore: 'chores',
  deps: 'chores',
  security: 'security',
  sec: 'security',
}

// First-word guesses for commits that don't follow Conventional Commits.
const WORD_TYPE: [RegExp, string][] = [
  [/^(add|adds|added|create|creates|implement|implements|introduce|introduces|support|supports|allow|allows|enable|enables|new)\b/i, 'feat'],
  [/^(fix|fixes|fixed|resolve|resolves|resolved|correct|corrects|patch|repair|handle)\b/i, 'fix'],
  [/^(remove|removes|removed|delete|deletes|deleted|drop|drops|dropped)\b/i, 'remove'],
  [/^(speed up|optimi[sz]e|optimi[sz]es|faster|cache)\b/i, 'perf'],
  [/^(docs?|document|documents|readme|update readme|write docs)\b/i, 'docs'],
  [/^(test|tests|add tests?|cover)\b/i, 'test'],
  [/^(bump|upgrade|upgrades|update dependencies|update deps|deps)\b/i, 'chore'],
  [/^(ci|build|release|deploy|dockerfile|workflow)\b/i, 'build'],
  [/^(refactor|refactors|rename|renames|move|moves|clean|cleans|cleanup|tidy|simplify|update|updates|improve|improves|change|changes|use|switch|replace|rework)\b/i, 'refactor'],
]

const HASH = /^([0-9a-f]{7,40})\b\s*/i
// `git log --oneline --decorate` adds "(HEAD -> main, tag: v1.0.0, origin/main)" after the hash.
const DECORATION = /^\((?:HEAD|tag: |origin\/)[^)]*\)\s+|^\([\w./-]+(?:, [\w./: -]+)*\)\s+/
const CONVENTIONAL = /^([a-z]+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/i
const PR_SUFFIX = /\s*\(#(\d+)\)\s*$/
const MERGE_PR = /^Merge pull request #(\d+) from \S+(?:\s+(.+))?$/i
const MERGE_OTHER = /^Merge (branch|remote-tracking branch|tag|commit) /i
const CLOSES = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi

const capitalise = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

function sectionFor(type: string): SectionId {
  if (type === 'remove') return 'removed'
  return TYPE_SECTION[type] ?? 'other'
}

/** Parse one line. Returns null for blank lines, comments and plain merge commits. */
export function parseLine(line: string, opts: { includeMerges?: boolean } = {}): Commit | null {
  const raw = line.trim()
  if (!raw || raw.startsWith('#')) return null
  let rest = raw.replace(/^[-*•]\s+/, '').replace(/^\*\s*/, '')
  let hash: string | undefined
  const h = rest.match(HASH)
  if (h && /\d/.test(h[1])) {
    hash = h[1]
    rest = rest.slice(h[0].length)
  }
  if (hash) rest = rest.replace(DECORATION, '')
  rest = rest.trim()
  if (!rest) return null

  let pr: number | undefined
  const mergePr = rest.match(MERGE_PR)
  if (mergePr) {
    if (!opts.includeMerges && !mergePr[2]) return null
    pr = Number(mergePr[1])
    rest = mergePr[2] ?? `Merge pull request #${pr}`
  } else if (MERGE_OTHER.test(rest)) {
    if (!opts.includeMerges) return null
  }

  const prMatch = rest.match(PR_SUFFIX)
  if (prMatch) {
    pr = Number(prMatch[1])
    rest = rest.slice(0, prMatch.index).trim()
  }

  const closes = [...rest.matchAll(CLOSES)].map((m) => Number(m[1]))

  let type: string
  let scope: string | undefined
  let breaking = false
  let subject: string
  let conventional = false
  const c = rest.match(CONVENTIONAL)
  if (c && (TYPE_SECTION[c[1].toLowerCase()] || c[1].toLowerCase() === 'remove')) {
    type = c[1].toLowerCase()
    scope = c[2]?.trim() || undefined
    breaking = Boolean(c[3])
    subject = c[4]
    conventional = true
  } else {
    subject = rest
    type = WORD_TYPE.find(([re]) => re.test(rest))?.[1] ?? 'other'
  }
  if (/BREAKING[ -]CHANGE/.test(rest)) breaking = true
  subject = subject
    .replace(/[,;]?\s*\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#\d+/gi, '')
    .replace(/[.,;\s]+$/, '')
    .replace(/\s+(?:and|or)$/i, '')
  subject = capitalise(subject.replace(/\s+/g, ' ').replace(/[.,;\s]+$/, ''))

  return {
    hash,
    type,
    scope,
    breaking,
    subject,
    pr,
    closes,
    section: breaking ? 'breaking' : sectionFor(type),
    conventional,
    raw,
  }
}

/** Parse pasted text: `git log --oneline` output, `%h %s` lines or plain commit subjects. */
export function parseCommits(text: string, opts: { includeMerges?: boolean } = {}): Commit[] {
  const out: Commit[] = []
  const seen = new Set<string>()
  for (const line of text.split(/\r?\n/)) {
    const c = parseLine(line, opts)
    if (!c) continue
    const key = c.hash ?? `${c.section}|${c.subject.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(c)
  }
  return out
}

export function groupBySection(commits: Commit[], hidden: SectionId[] = []) {
  return SECTIONS.filter((s) => !hidden.includes(s.id))
    .map((s) => ({ section: s, commits: commits.filter((c) => c.section === s.id) }))
    .filter((g) => g.commits.length > 0)
}

export type Bump = 'major' | 'minor' | 'patch'

/** Semantic versioning: breaking → major, any feature → minor, otherwise patch. */
export function suggestBump(commits: Commit[]): Bump {
  if (commits.some((c) => c.breaking)) return 'major'
  if (commits.some((c) => c.section === 'features')) return 'minor'
  return 'patch'
}

/**
 * Next version after `current` (with or without a leading "v"). Before 1.0.0 a breaking
 * change bumps the minor number, which is the usual 0.x convention.
 */
export function nextVersion(current: string, bump: Bump): string {
  const m = current.trim().match(/^(v?)(\d+)\.(\d+)\.(\d+)/)
  if (!m) return ''
  const [, v, ma, mi, pa] = m
  let [major, minor, patch] = [Number(ma), Number(mi), Number(pa)]
  if (bump === 'major' && major === 0) bump = 'minor'
  if (bump === 'major') [major, minor, patch] = [major + 1, 0, 0]
  else if (bump === 'minor') [minor, patch] = [minor + 1, 0]
  else patch += 1
  return `${v}${major}.${minor}.${patch}`
}

export interface RenderOptions {
  /** e.g. https://github.com/owner/repo, used to link commits, PRs and the compare view. */
  repoUrl?: string
  version?: string
  previousVersion?: string
  /** YYYY-MM-DD */
  date?: string
  hidden?: SectionId[]
  title?: string
}

/** Accepts github.com URLs in https, ssh or bare form and returns https://github.com/owner/repo. */
export function normaliseRepoUrl(input?: string): string | undefined {
  if (!input) return undefined
  const s = input.trim().replace(/\.git$/, '').replace(/\/+$/, '')
  const m = s.match(/^(?:https?:\/\/)?(?:www\.)?github\.com[/:]([\w.-]+)\/([\w.-]+)$/i) ?? s.match(/^git@github\.com:([\w.-]+)\/([\w.-]+)$/i) ?? s.match(/^([\w.-]+)\/([\w.-]+)$/)
  return m ? `https://github.com/${m[1]}/${m[2]}` : undefined
}

function item(c: Commit, repo?: string, withScope = true): string {
  const scope = withScope && c.scope ? `**${c.scope}:** ` : ''
  const refs: string[] = []
  if (c.pr) refs.push(repo ? `[#${c.pr}](${repo}/pull/${c.pr})` : `#${c.pr}`)
  if (c.hash) refs.push(repo ? `[\`${c.hash.slice(0, 7)}\`](${repo}/commit/${c.hash})` : `\`${c.hash.slice(0, 7)}\``)
  return `- ${scope}${c.subject}${refs.length ? ` (${refs.join(', ')})` : ''}`
}

/** A version section in the Keep a Changelog format (paste it at the top of CHANGELOG.md). */
export function renderChangelog(commits: Commit[], o: RenderOptions = {}): string {
  const repo = normaliseRepoUrl(o.repoUrl)
  const version = (o.version || 'Unreleased').replace(/^v/, '')
  const heading = `[${version}]`
  const lines = [`## ${heading}${o.date && version !== 'Unreleased' ? ` - ${o.date}` : ''}`, '']
  for (const g of groupBySection(commits, o.hidden)) {
    lines.push(`### ${g.section.changelog}`, '', ...g.commits.map((c) => item(c, repo)), '')
  }
  if (repo && o.version && o.previousVersion) {
    lines.push(`[${version}]: ${repo}/compare/${tag(o.previousVersion)}...${tag(o.version)}`, '')
  }
  return lines.join('\n').trimEnd() + '\n'
}

const tag = (v: string) => (v.startsWith('v') ? v : `v${v}`)

function summarySentence(commits: Commit[]): string {
  const count = (s: SectionId) => commits.filter((c) => c.section === s).length
  const parts: string[] = []
  const f = count('features')
  const x = count('fixes')
  const b = count('breaking')
  if (f) parts.push(`adds ${f} ${f === 1 ? 'feature' : 'features'}`)
  if (x) parts.push(`fixes ${x} ${x === 1 ? 'bug' : 'bugs'}`)
  const rest = commits.length - f - x - b
  if (rest) parts.push(`includes ${rest} other ${rest === 1 ? 'change' : 'changes'}`)
  if (b) parts.push(`has ${b} breaking ${b === 1 ? 'change' : 'changes'}`)
  if (!parts.length) return ''
  const last = parts.pop()
  return `This PR ${parts.length ? `${parts.join(', ')} and ${last}` : last}.`
}

/** A pull request description: summary, grouped changes, testing steps and a checklist. */
export function renderPrDescription(commits: Commit[], o: RenderOptions = {}): string {
  const repo = normaliseRepoUrl(o.repoUrl)
  const lines: string[] = []
  if (o.title) lines.push(`# ${o.title}`, '')
  lines.push('## Summary', '', summarySentence(commits) || 'Describe what this PR does and why.', '')
  const breaking = commits.filter((c) => c.breaking)
  if (breaking.length) {
    lines.push('## ⚠️ Breaking changes', '', ...breaking.map((c) => item(c, repo)), '', 'Explain what users must change after this PR.', '')
  }
  lines.push('## Changes', '')
  for (const g of groupBySection(commits, ['breaking', ...(o.hidden ?? [])])) {
    lines.push(`### ${g.section.friendly}`, '', ...g.commits.map((c) => item(c, repo)), '')
  }
  lines.push('## How to test', '', '1. Check out this branch and install dependencies.', '2. Describe the steps a reviewer should follow.', '3. Describe what they should see.', '')
  lines.push('## Checklist', '', '- [ ] Tests added or updated', '- [ ] Docs updated', '- [ ] Screenshots added for UI changes', '')
  const closes = [...new Set(commits.flatMap((c) => c.closes))]
  if (closes.length) lines.push(closes.map((n) => `Closes #${n}`).join('\n'), '')
  return lines.join('\n').trimEnd() + '\n'
}

/** Friendly release notes for a GitHub release page. */
export function renderReleaseNotes(commits: Commit[], o: RenderOptions = {}): string {
  const repo = normaliseRepoUrl(o.repoUrl)
  const lines: string[] = []
  const name = o.version ? tag(o.version) : 'This release'
  lines.push(`## ${name}${o.date ? ` (${o.date})` : ''}`, '')
  const f = commits.filter((c) => c.section === 'features').length
  const x = commits.filter((c) => c.section === 'fixes').length
  const bits = [f && `${f} new ${f === 1 ? 'feature' : 'features'}`, x && `${x} ${x === 1 ? 'fix' : 'fixes'}`].filter(Boolean)
  if (bits.length) lines.push(`${bits.join(' and ')} in this release.`, '')
  for (const g of groupBySection(commits, o.hidden)) {
    lines.push(`### ${g.section.friendly}`, '', ...g.commits.map((c) => item(c, repo, false)), '')
  }
  if (repo && o.version && o.previousVersion) {
    lines.push(`**Full changelog:** ${repo}/compare/${tag(o.previousVersion)}...${tag(o.version)}`, '')
  }
  return lines.join('\n').trimEnd() + '\n'
}

export const EXAMPLE_LOG = `a1b2c3d (HEAD -> main) feat(auth): add sign in with email code (#42)
b2c3d4e fix(auth): show an error when the code has expired
c3d4e5f feat!: drop support for Node 18
d4e5f6a perf(search): cache search results for 5 minutes (#40)
e5f6a7b docs: explain the release process in README
f6a7b8c refactor(api): split the user service into smaller files
0a1b2c3 Merge pull request #39 from team/fix-dark-mode
1b2c3d4 Fix dark mode colours on the settings page, closes #37
2c3d4e5 Add CSV export to the reports page
3d4e5f6 chore(deps): bump vite from 6.2 to 6.3
4e5f6a7 ci: run tests on every pull request
5f6a7b8 Remove the old v1 API endpoints`
