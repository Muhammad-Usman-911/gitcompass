import Fuse from 'fuse.js'
import { commands, guides, pathById, settingsItems, workflows } from '@/content'
import { challenges } from '@/sim/challenges'
import { plain } from './markup'

export type ResultType = 'guide' | 'setting' | 'command' | 'challenge' | 'workflow' | 'page'
export interface SearchItem {
  type: ResultType
  title: string
  subtitle: string
  keywords: string
  body: string
  href: string
  color?: string
}

const pages: SearchItem[] = [
  { type: 'page', title: 'Playground', subtitle: 'Free git sandbox with a live commit graph', keywords: 'simulator terminal practice try sandbox', body: '', href: '/playground' },
  { type: 'page', title: 'Challenges', subtitle: 'Game levels: solve real git situations', keywords: 'game levels quiz xp practice', body: '', href: '/challenges' },
  { type: 'page', title: 'GitHub settings tour', subtitle: 'Every repository settings page explained', keywords: 'settings repository github admin', body: '', href: '/github' },
  { type: 'page', title: 'CI/CD lab', subtitle: 'Pipelines and GitHub Actions from zero', keywords: 'ci cd pipeline actions workflow yaml deploy', body: '', href: '/cicd' },
  { type: 'page', title: 'Changelog & PR writer', subtitle: 'Paste commits, get a CHANGELOG, PR description or release notes', keywords: 'changelog release notes pull request description pr template generator conventional commits semver version bump', body: '', href: '/changelog' },
  { type: 'page', title: 'Command reference', subtitle: 'Every git command with flags and examples', keywords: 'cheat sheet commands flags reference', body: '', href: '/commands' },
]

export const searchItems: SearchItem[] = [
  ...guides.map((g) => ({
    type: 'guide' as const,
    title: g.title,
    subtitle: `${pathById[g.path].title} · ${plain(g.summary)}`,
    keywords: g.keywords.join(' | '),
    body: [...g.whenToUse, ...g.steps.map((s) => `${s.text} ${s.code ?? ''}`)].map(plain).join(' '),
    href: `/guide/${g.id}`,
    color: pathById[g.path].color,
  })),
  ...settingsItems.map((s) => ({
    type: 'setting' as const,
    title: `Settings → ${s.label}`,
    subtitle: plain(s.summary),
    keywords: s.keywords.join(' | '),
    body: [...s.whatItIs, ...s.whenToUse].map(plain).join(' '),
    href: `/github/${s.id}`,
    color: '#fbbf24',
  })),
  ...commands.map((c) => ({
    type: 'command' as const,
    title: c.name,
    subtitle: plain(c.summary),
    keywords: [...(c.keywords ?? []), c.syntax, ...c.flags.map((f) => f.flag)].join(' | '),
    body: c.examples.map((e) => `${e.code} ${e.desc}`).join(' '),
    href: `/commands#${encodeURIComponent(c.name)}`,
    color: '#22d3ee',
  })),
  ...challenges.map((c) => ({
    type: 'challenge' as const,
    title: `Challenge: ${c.title}`,
    subtitle: c.story,
    keywords: `${c.world} game level practice`,
    body: c.hints.map(plain).join(' '),
    href: `/challenges/${c.id}`,
    color: '#f472b6',
  })),
  ...workflows.map((w) => ({
    type: 'workflow' as const,
    title: `Workflow: ${w.title}`,
    subtitle: plain(w.summary),
    keywords: `github actions yaml ${w.file}`,
    body: w.annotations.map((a) => a.title).join(' '),
    href: `/cicd#${w.id}`,
    color: '#a78bfa',
  })),
  ...pages,
]

const fuse = new Fuse(searchItems, {
  includeScore: true,
  ignoreLocation: true,
  threshold: 0.38,
  minMatchCharLength: 2,
  keys: [
    { name: 'title', weight: 3 },
    { name: 'keywords', weight: 2.5 },
    { name: 'subtitle', weight: 1 },
    { name: 'body', weight: 0.4 },
  ],
})

const STOP = new Set(['git', 'how', 'to', 'do', 'i', 'a', 'an', 'the', 'my', 'in', 'on', 'of', 'for', 'with', 'is', 'what', 'can', 'from', 'and'])
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9.\-/ ]+/g, ' ')
const lower = searchItems.map((i) => ({ title: norm(i.title), keywords: norm(i.keywords), subtitle: norm(i.subtitle), body: norm(i.body) }))

/** Fuzzy search, then re-rank so results containing all the words (in any order) win. */
export function search(q: string, limit = 30): SearchItem[] {
  const query = q.trim()
  if (!query) return []
  const tokens = norm(query).split(/\s+/).filter((t) => t && !STOP.has(t))
  const phrase = tokens.join(' ')
  const hits = fuse.search(query, { limit: 80 })
  const scored = hits.map((h) => {
    const f = lower[h.refIndex]
    let coverage = 0
    for (const t of tokens) {
      coverage += f.title.includes(t) ? 1 : f.keywords.includes(t) ? 0.9 : f.subtitle.includes(t) ? 0.5 : f.body.includes(t) ? 0.2 : 0
    }
    coverage = tokens.length ? coverage / tokens.length : 0
    const phraseBonus = phrase && (f.keywords.includes(phrase) || f.title.includes(phrase)) ? 1 : 0
    return { item: h.item, score: coverage * 2 + phraseBonus * 1.2 + (1 - (h.score ?? 1)) }
  })
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.item)
}
