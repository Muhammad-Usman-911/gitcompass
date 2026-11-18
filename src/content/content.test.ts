import { describe, expect, it } from 'vitest'
import { commands, guideById, guides, settingsItems, workflows } from './index'
import { runAll, runCommand } from '../sim/git'

// Lines that are an expected part of a teaching demo, not a broken command.
const EXPECTED = /CONFLICT|Automatic merge failed|\[rejected\]|failed to push|stale info|not fully merged|would be overwritten|no upstream|unmerged|nothing to commit|no changes added|fresh clone|Refusing|Aborting|Please operate|anyway, use --force|expected freshly|both modified/

describe('content integrity', () => {
  it('guide ids are unique', () => {
    expect(new Set(guides.map((g) => g.id)).size).toBe(guides.length)
  })

  it('related ids exist', () => {
    const missing: string[] = []
    for (const g of guides) for (const r of g.related ?? []) if (!guideById[r]) missing.push(`${g.id} -> ${r}`)
    for (const s of settingsItems) for (const r of s.relatedGuides ?? []) if (!guideById[r]) missing.push(`${s.id} -> ${r}`)
    for (const c of commands) if (c.guide && !guideById[c.guide]) missing.push(`${c.name} -> ${c.guide}`)
    expect(missing).toEqual([])
  })

  it('workflow annotations are in range', () => {
    for (const w of workflows) {
      const n = w.yaml.split('\n').length
      for (const a of w.annotations) {
        expect(a.from).toBeGreaterThanOrEqual(1)
        expect(a.to).toBeLessThanOrEqual(n)
        expect(a.from).toBeLessThanOrEqual(a.to)
      }
    }
  })
})

describe('sandbox demos run in the simulator', () => {
  for (const g of guides.filter((g) => g.sandbox)) {
    it(g.id, () => {
      let s = runAll([]).state
      for (const cmd of g.sandbox!.setup ?? []) {
        const r = runCommand(s, cmd)
        expect(r.failed && !r.lines.some((l) => EXPECTED.test(l.text)), `setup: ${cmd} → ${r.lines.map((l) => l.text).join(' | ')}`).toBeFalsy()
        s = r.state
      }
      const problems: string[] = []
      for (const cmd of g.sandbox!.commands) {
        const r = runCommand(s, cmd)
        if (r.failed && !r.lines.some((l) => EXPECTED.test(l.text))) problems.push(`${cmd} → ${r.lines.map((l) => l.text).join(' | ')}`)
        s = r.state
      }
      expect(problems).toEqual([])
    })
  }
})
