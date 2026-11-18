import { describe, expect, it } from 'vitest'
import { challenges, goalStatus } from './challenges'
import { runAll, runCommand } from './git'

describe('challenges', () => {
  for (const c of challenges) {
    it(`${c.id}: setup runs clean, starts unsolved, solution solves it`, () => {
      const setup = runAll(c.setup)
      const errs = setup.lines.filter((l) => l.kind === 'err')
      expect(errs, errs.map((e) => e.text).join('\n')).toHaveLength(0)
      expect(goalStatus(c, setup.state).every(Boolean)).toBe(false)

      let s = setup.state
      for (const cmd of c.solution) {
        let real = cmd
        if (cmd === '__REFLOG_INVOICES__') real = `git reset --hard ${s.reflog.find((e) => e.msg === 'commit: Add invoices')!.id}`
        const r = runCommand(s, real)
        const bad = r.lines.filter((l) => l.kind === 'err' && !/CONFLICT|Automatic merge failed/.test(l.text))
        expect(bad, `${real}: ${bad.map((b) => b.text).join('\n')}`).toHaveLength(0)
        s = r.state
      }
      expect(goalStatus(c, s)).toEqual(c.goals.map(() => true))
    })
  }
})
