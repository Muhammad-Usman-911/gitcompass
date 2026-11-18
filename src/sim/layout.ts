import type { RepoState } from './types'

export interface GNode {
  id: string
  message: string
  col: number
  lane: number
  merge: boolean
  author: string
}
export interface GEdge {
  from: string // child
  to: string // parent
}
export interface GLabel {
  name: string
  kind: 'branch' | 'head-branch' | 'remote' | 'tag' | 'head'
}
export interface GraphLayout {
  nodes: GNode[]
  edges: GEdge[]
  labels: Record<string, GLabel[]>
  lanes: number
  cols: number
  headId?: string
  laneNames: string[]
}

/** Lays commits out left→right by time, one lane per branch (first-parent chains). */
export function layoutGraph(s: RepoState): GraphLayout {
  const headId = s.head.type === 'branch' ? s.branches[s.head.name] : s.head.id
  const curBranch = s.head.type === 'branch' ? s.head.name : null

  const branchOrder = Object.keys(s.branches).sort((a, b) => {
    const rank = (n: string) => (n === 'main' || n === 'master' ? 0 : n === 'develop' ? 1 : 2)
    return rank(a) - rank(b) || a.localeCompare(b)
  })
  const tips: { name: string; id: string }[] = [
    ...branchOrder.map((b) => ({ name: b, id: s.branches[b] })),
    ...(s.head.type === 'detached' ? [{ name: 'HEAD', id: s.head.id }] : []),
    ...Object.entries(s.remoteRefs)
      .sort()
      .map(([n, id]) => ({ name: n, id })),
    ...Object.entries(s.tags)
      .sort()
      .map(([n, id]) => ({ name: n, id })),
  ].filter((t) => t.id && s.commits[t.id])

  // visible commits = reachable from any tip
  const visible = new Set<string>()
  const stack = tips.map((t) => t.id)
  while (stack.length) {
    const c = stack.pop()!
    if (visible.has(c)) continue
    visible.add(c)
    stack.push(...s.commits[c].parents)
  }

  const ordered = [...visible].map((id) => s.commits[id]).sort((a, b) => a.seq - b.seq)
  const col: Record<string, number> = {}
  ordered.forEach((c, i) => (col[c.id] = i))

  const lane: Record<string, number> = {}
  const laneNames: string[] = []
  let next = 0
  for (const t of tips) {
    let c: string | undefined = t.id
    let used = false
    while (c && lane[c] === undefined) {
      lane[c] = next
      used = true
      c = s.commits[c].parents[0]
    }
    if (used) {
      laneNames[next] = t.name
      next++
    }
  }

  const nodes: GNode[] = ordered.map((c) => ({
    id: c.id,
    message: c.message,
    col: col[c.id],
    lane: lane[c.id] ?? 0,
    merge: c.parents.length > 1,
    author: c.author,
  }))
  const edges: GEdge[] = []
  for (const c of ordered) for (const p of c.parents) if (visible.has(p)) edges.push({ from: c.id, to: p })

  const labels: Record<string, GLabel[]> = {}
  const add = (id: string, l: GLabel) => (labels[id] ??= []).push(l)
  for (const b of branchOrder) add(s.branches[b], { name: b, kind: b === curBranch ? 'head-branch' : 'branch' })
  if (s.head.type === 'detached') add(s.head.id, { name: 'HEAD', kind: 'head' })
  for (const [r, id] of Object.entries(s.remoteRefs)) if (s.commits[id]) add(id, { name: r, kind: 'remote' })
  for (const [t, id] of Object.entries(s.tags)) if (s.commits[id]) add(id, { name: t, kind: 'tag' })

  return { nodes, edges, labels, lanes: Math.max(next, 1), cols: ordered.length, headId, laneNames }
}
