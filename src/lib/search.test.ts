import { describe, expect, it } from 'vitest'
import { search } from './search'

const top = (q: string, n = 3) => search(q).slice(0, n).map((r) => r.href)

describe('search finds what people type', () => {
  it.each([
    ['git history rewrite', '/guide/remove-secrets-from-history'],
    ['rewrite git history', '/guide/remove-secrets-from-history'],
    ['remove password from git', '/guide/remove-secrets-from-history'],
    ['undo last commit', '/guide/undo-last-commit'],
    ['merge conflict', '/guide/resolve-merge-conflicts'],
    ['environments', '/github/environments'],
    ['deploy keys', '/github/deploy-keys'],
    ['what is ci cd', '/guide/what-is-ci-cd'],
    ['ssh key', '/guide/ssh-keys-github'],
  ])('%s', (q, href) => {
    expect(top(q, 2)).toContain(href)
  })
})
