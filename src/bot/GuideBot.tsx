import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, MessageCircle, Search, X } from 'lucide-react'
import { Robot, type BotSignals } from './Robot'
import { tourFor } from './tours'
import { Markup } from '@/lib/markup'
import { useSearch } from '@/components/SearchPalette'
import { readJSON, writeJSON } from '@/lib/utils'

const HIDE_KEY = 'gc-bot-hidden'
const SEEN_KEY = 'gc-bot-seen'

function useViewport() {
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return vp
}

export default function GuideBot() {
  const { pathname } = useLocation()
  const { open: openSearch } = useSearch()
  const vp = useViewport()
  const size = vp.w < 640 ? 92 : 128
  const home = useCallback(() => ({ x: vp.w - size - 14, y: vp.h - size - 10 }), [vp, size])

  const [hidden, setHidden] = useState(() => readJSON(HIDE_KEY, false))
  const [bubble, setBubble] = useState(false)
  const [step, setStep] = useState(0)
  const [pos, setPos] = useState(home)
  const [ask, setAsk] = useState('')
  const steps = tourFor(pathname)
  const signals = useRef<BotSignals>({ pointer: { x: 0, y: 0 }, talking: false, hop: 0, reduced: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false })
  const highlighted = useRef<Element | null>(null)

  // eyes follow the pointer
  useEffect(() => {
    const on = (e: PointerEvent) => {
      const cx = pos.x + size / 2
      const cy = pos.y + size / 2
      signals.current.pointer = { x: Math.max(-1, Math.min(1, (e.clientX - cx) / 500)), y: Math.max(-1, Math.min(1, (e.clientY - cy) / 400)) }
    }
    window.addEventListener('pointermove', on)
    return () => window.removeEventListener('pointermove', on)
  }, [pos, size])

  const clearHighlight = () => {
    highlighted.current?.classList.remove('tour-highlight')
    highlighted.current = null
  }

  // new page: go home, hop, and greet once per page per visitor
  useEffect(() => {
    clearHighlight()
    setStep(0)
    setPos(home())
    signals.current.hop = 1
    const seen = readJSON<string[]>(SEEN_KEY, [])
    const key = pathname.split('/').slice(0, 2).join('/') || '/'
    if (!seen.includes(key) && !hidden) {
      const t = setTimeout(() => {
        setBubble(true)
        writeJSON(SEEN_KEY, [...readJSON<string[]>(SEEN_KEY, []), key])
      }, 900)
      return () => clearTimeout(t)
    }
    setBubble(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    if (!bubble) setPos(home())
  }, [vp, bubble, home])

  // talking animation while bubble shows
  useEffect(() => {
    signals.current.talking = bubble
    if (!bubble) return
    const t = setTimeout(() => (signals.current.talking = false), 1600)
    return () => clearTimeout(t)
  }, [bubble, step])

  // point at the step's target: scroll to it, highlight, fly next to it
  useEffect(() => {
    clearHighlight()
    if (!bubble) return
    const s = steps[step]
    const el = s?.target ? document.querySelector(s.target) : null
    if (!el) {
      setPos(home())
      return
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const t = setTimeout(() => {
      el.classList.add('tour-highlight')
      highlighted.current = el
      const r = el.getBoundingClientRect()
      let x: number
      if (r.right + size + 16 < vp.w) x = r.right + 8
      else if (r.left - size - 16 > 0) x = r.left - size - 8
      else x = vp.w - size - 14
      const y = Math.min(Math.max(r.top + r.height / 2 - size / 2, 72), vp.h - size - 10)
      setPos({ x, y })
      signals.current.hop = 0.6
    }, 450)
    return () => clearTimeout(t)
  }, [bubble, step, steps, vp, size, home])

  useEffect(() => () => clearHighlight(), [])

  const toggleHidden = (h: boolean) => {
    setHidden(h)
    writeJSON(HIDE_KEY, h)
    if (h) {
      setBubble(false)
      clearHighlight()
    }
  }

  if (hidden)
    return (
      <button
        onClick={() => toggleHidden(false)}
        className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 rounded-full border bg-card/90 px-3 py-2 text-xs shadow-lg backdrop-blur hover:border-primary"
        aria-label="Show the guide bot"
      >
        <MessageCircle className="h-4 w-4 text-primary" /> Compass
      </button>
    )

  const bubbleW = Math.min(320, vp.w - 24)
  const above = pos.y > 300
  const alignRight = pos.x + size / 2 > vp.w / 2
  const bubbleLeft = Math.min(Math.max(alignRight ? pos.x + size - bubbleW : pos.x, 12), vp.w - bubbleW - 12)
  const s = steps[step]

  return (
    <>
      <motion.div
        className="fixed left-0 top-0 z-[60]"
        style={{ width: size, height: size }}
        animate={{ x: pos.x, y: pos.y }}
        initial={false}
        transition={{ type: 'spring', stiffness: 90, damping: 15, mass: 0.9 }}
      >
        <button
          onClick={() => {
            setBubble((b) => !b)
            signals.current.hop = 0.7
          }}
          className="h-full w-full cursor-pointer rounded-full focus-visible:outline-2"
          aria-label={bubble ? 'Close guide' : 'Open guide'}
          title="Compass, your guide"
        >
          <Canvas dpr={[1, 2]} camera={{ position: [0, 0.05, 4.2], fov: 34 }} gl={{ alpha: true, antialias: true }} style={{ pointerEvents: 'none' }}>
            <ambientLight intensity={0.7} />
            <directionalLight position={[2, 3, 4]} intensity={1.6} />
            <pointLight position={[-3, 1, 2]} intensity={14} color="#22d3ee" />
            <pointLight position={[3, -1, 2]} intensity={10} color="#a78bfa" />
            <Robot signals={signals} />
          </Canvas>
        </button>
      </motion.div>

      <AnimatePresence>
        {bubble && s && (
          <motion.div
            key="bubble"
            role="dialog"
            aria-label="Guide"
            initial={{ opacity: 0, scale: 0.9, y: above ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 160, damping: 20 }}
            className="fixed z-[61] rounded-2xl border bg-popover p-4 text-sm shadow-2xl transition-[left,top,bottom] duration-700 ease-out"
            style={{ width: bubbleW, left: bubbleLeft, ...(above ? { bottom: vp.h - pos.y + 10 } : { top: pos.y + size + 8 }) }}
          >
            <div className="flex items-start gap-2">
              <p className="flex-1 leading-6">
                <Markup text={s.text} />
              </p>
              <button onClick={() => setBubble(false)} className="rounded p-0.5 text-muted-foreground hover:text-foreground" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            {steps.length > 1 && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex gap-1">
                  {steps.map((_, i) => (
                    <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-4 bg-primary' : 'w-1.5 bg-border'}`} />
                  ))}
                </div>
                <div className="ml-auto flex gap-1">
                  <button disabled={step === 0} onClick={() => setStep((x) => x - 1)} className="rounded-md border p-1 disabled:opacity-30" aria-label="Previous tip">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {step < steps.length - 1 ? (
                    <button onClick={() => setStep((x) => x + 1)} className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button onClick={() => setBubble(false)} className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
                      Got it
                    </button>
                  )}
                </div>
              </div>
            )}
            <form
              className="mt-3 flex items-center gap-2 rounded-lg border bg-background/60 px-2"
              onSubmit={(e) => {
                e.preventDefault()
                setBubble(false)
                openSearch(ask)
                setAsk('')
              }}
            >
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Ask me: how do I…" className="h-8 w-full bg-transparent text-xs outline-none" aria-label="Ask the guide" />
            </form>
            <button onClick={() => toggleHidden(true)} className="mt-2 text-[11px] text-muted-foreground hover:text-foreground">
              Hide the bot
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
