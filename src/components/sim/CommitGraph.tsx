import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { layoutGraph } from '@/sim/layout'
import type { RepoState } from '@/sim/types'
import { cn } from '@/lib/utils'

export const LANE_COLORS = ['#22d3ee', '#a78bfa', '#f472b6', '#fbbf24', '#34d399', '#fb923c', '#60a5fa', '#f87171']
const COL_W = 76
const LANE_H = 64
const PAD_X = 48
const PAD_Y = 52

const labelStyle: Record<string, string> = {
  'head-branch': 'bg-primary text-primary-foreground border-primary',
  branch: 'bg-secondary text-secondary-foreground',
  remote: 'bg-violet-500/15 text-violet-300 border-violet-500/40',
  tag: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  head: 'bg-rose-500 text-white border-rose-500',
}

export function CommitGraph({ state, className, compact }: { state: RepoState; className?: string; compact?: boolean }) {
  const g = useMemo(() => layoutGraph(state), [state])
  const scroller = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<string | null>(null)

  const width = Math.max(PAD_X * 2 + Math.max(g.cols - 1, 0) * COL_W + 140, 320)
  const height = PAD_Y + g.lanes * LANE_H + 26
  const pos = (id: string) => {
    const n = g.nodes.find((x) => x.id === id)!
    return { x: PAD_X + n.col * COL_W, y: PAD_Y + n.lane * LANE_H }
  }

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' })
  }, [g.cols])

  if (!state.initialized)
    return (
      <div className={cn('grid place-items-center rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground', className)}>
        <div>
          <p className="font-medium text-foreground">No repository yet</p>
          <p className="mt-1">
            Type <code className="font-mono text-primary">git init</code> or <code className="font-mono text-primary">git clone &lt;url&gt;</code>
          </p>
        </div>
      </div>
    )

  if (!g.nodes.length)
    return (
      <div className={cn('grid place-items-center rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground', className)}>
        <div>
          <p className="font-medium text-foreground">Empty repository on <span className="text-primary">{state.head.type === 'branch' ? state.head.name : 'HEAD'}</span></p>
          <p className="mt-1">Create a file, <code className="font-mono text-primary">git add</code> it and <code className="font-mono text-primary">git commit</code>.</p>
        </div>
      </div>
    )

  const hovered = hover ? state.commits[hover] : null

  return (
    <div className={cn('relative', className)}>
      <div ref={scroller} className="scrollbar-thin overflow-x-auto overflow-y-hidden">
        <svg width={width} height={height} className="block" role="img" aria-label="Commit graph">
          <defs>
            <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* lane guides */}
          {Array.from({ length: g.lanes }).map((_, i) => (
            <g key={`lane-${i}`}>
              <line x1={0} x2={width} y1={PAD_Y + i * LANE_H} y2={PAD_Y + i * LANE_H} stroke="hsl(var(--border))" strokeDasharray="2 6" />
              {!compact && g.laneNames[i] && (
                <text x={6} y={PAD_Y + i * LANE_H - 22} fontSize={10} fill={LANE_COLORS[i % LANE_COLORS.length]} opacity={0.6} fontFamily="JetBrains Mono">
                  {g.laneNames[i]}
                </text>
              )}
            </g>
          ))}
          <AnimatePresence>
            {g.edges.map((e) => {
              const a = pos(e.from)
              const b = pos(e.to)
              const child = g.nodes.find((n) => n.id === e.from)!
              const parent = g.nodes.find((n) => n.id === e.to)!
              const laneColor = LANE_COLORS[(child.lane === parent.lane ? child.lane : child.merge && e.to !== state.commits[e.from].parents[0] ? parent.lane : child.lane) % LANE_COLORS.length]
              const mx = (a.x + b.x) / 2
              const d = a.y === b.y ? `M ${b.x} ${b.y} C ${mx} ${b.y}, ${mx} ${a.y}, ${a.x} ${a.y}` : `M ${b.x} ${b.y} C ${b.x + COL_W * 0.7} ${b.y}, ${a.x - COL_W * 0.7} ${a.y}, ${a.x} ${a.y}`
              return (
                <motion.path
                  key={`${e.from}-${e.to}`}
                  d={d}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.9 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                  fill="none"
                  stroke={laneColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              )
            })}
          </AnimatePresence>
          <AnimatePresence>
            {g.nodes.map((n) => {
              const p = pos(n.id)
              const color = LANE_COLORS[n.lane % LANE_COLORS.length]
              const isHead = n.id === g.headId
              const labels = g.labels[n.id] ?? []
              return (
                <motion.g
                  key={n.id}
                  initial={{ opacity: 0, scale: 0.2, x: p.x, y: p.y }}
                  animate={{ opacity: 1, scale: 1, x: p.x, y: p.y }}
                  exit={{ opacity: 0, scale: 0.2 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover(null)}
                  style={{ cursor: 'default' }}
                >
                  {isHead && (
                    <motion.circle r={17} fill="none" stroke={color} strokeWidth={2} initial={{ opacity: 0 }} animate={{ opacity: [0.9, 0.2, 0.9] }} transition={{ duration: 2, repeat: Infinity }} />
                  )}
                  <circle r={n.merge ? 11 : 10} fill="hsl(var(--card))" stroke={color} strokeWidth={3} filter={isHead ? 'url(#node-glow)' : undefined} />
                  {n.merge && <circle r={4} fill={color} />}
                  {n.author === 'Teammate' && <circle r={3.5} fill="#fbbf24" cx={8} cy={-8} />}
                  <text y={30} textAnchor="middle" fontSize={10} fontFamily="JetBrains Mono" fill="hsl(var(--muted-foreground))">
                    {n.id.slice(0, 7)}
                  </text>
                  {labels.length > 0 && (
                    <foreignObject x={-70} y={-48 - (labels.length - 1) * 0} width={140} height={30} style={{ overflow: 'visible' }}>
                      <div className="flex justify-center gap-1">
                        {labels.slice(0, 3).map((l) => (
                          <span key={l.name} className={cn('whitespace-nowrap rounded-md border px-1.5 py-[1px] font-mono text-[10px] leading-4', labelStyle[l.kind])}>
                            {l.kind === 'head-branch' ? `HEAD→${l.name}` : l.kind === 'tag' ? `🏷 ${l.name}` : l.name}
                          </span>
                        ))}
                        {labels.length > 3 && <span className="rounded-md border px-1 font-mono text-[10px]">+{labels.length - 3}</span>}
                      </div>
                    </foreignObject>
                  )}
                </motion.g>
              )
            })}
          </AnimatePresence>
        </svg>
      </div>
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute bottom-2 left-2 max-w-[90%] rounded-lg border bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur"
          >
            <span className="font-mono text-primary">{hovered.id}</span> · {hovered.author}
            <div className="mt-0.5 font-medium">{hovered.message}</div>
            <div className="mt-0.5 text-muted-foreground">files: {Object.keys(hovered.tree).join(', ') || '(none)'}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
