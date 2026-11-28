import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CodeBlock({ code, className, lang = 'bash' }: { code: string; className?: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      /* clipboard blocked */
    }
  }
  const isShell = lang === 'bash'
  return (
    <div className={cn('group relative overflow-hidden rounded-lg border bg-term', className)}>
      <button
        onClick={copy}
        aria-label="Copy code"
        className="absolute right-2 top-2 rounded-md border border-white/10 bg-white/5 p-1.5 text-slate-300 opacity-70 transition hover:opacity-100"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <pre className="scrollbar-thin overflow-x-auto p-4 pr-12 font-mono text-[13px] leading-6 text-slate-200">
        {code.split('\n').map((line, i) => (
          <div key={i}>
            {isShell && line.trim().startsWith('#') ? (
              <span className="text-slate-500">{line}</span>
            ) : isShell && line.trim() ? (
              <>
                <span className="select-none text-cyan-400/70">$ </span>
                <ShellLine line={line} />
              </>
            ) : (
              <YamlLine line={line} plain={!isShell && lang !== 'yaml'} />
            )}
          </div>
        ))}
      </pre>
    </div>
  )
}

function ShellLine({ line }: { line: string }) {
  const [first, ...rest] = line.split(' ')
  const comment = line.indexOf(' #')
  if (comment > 0) {
    return (
      <>
        <ShellLine line={line.slice(0, comment)} />
        <span className="text-slate-500">{line.slice(comment)}</span>
      </>
    )
  }
  return (
    <>
      <span className={first === 'git' ? 'text-orange-300' : 'text-cyan-300'}>{first}</span>
      {rest.length > 0 && ' '}
      {rest.map((w, i) => (
        <span key={i} className={w.startsWith('-') ? 'text-violet-300' : w.startsWith('"') || w.startsWith("'") ? 'text-emerald-300' : ''}>
          {w}
          {i < rest.length - 1 ? ' ' : ''}
        </span>
      ))}
    </>
  )
}

export function YamlLine({ line, plain }: { line: string; plain?: boolean }) {
  if (plain || !line.trim()) return <>{line || ' '}</>
  if (line.trim().startsWith('#')) return <span className="text-slate-500">{line}</span>
  const m = line.match(/^(\s*-?\s*)([\w.-]+)(:)(.*)$/)
  if (!m) return <span className="text-emerald-300">{line}</span>
  return (
    <>
      {m[1]}
      <span className="text-cyan-300">{m[2]}</span>
      <span className="text-slate-500">{m[3]}</span>
      <span className={/\$\{\{/.test(m[4]) ? 'text-violet-300' : 'text-emerald-300'}>{m[4]}</span>
    </>
  )
}
