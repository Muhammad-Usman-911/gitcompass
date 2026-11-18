import { Fragment, type ReactNode } from 'react'

/** Renders the tiny inline markup used in content: `code` and **bold**. */
export function Markup({ text }: { text: string }): ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('`') && p.endsWith('`') && p.length > 1)
      return (
        <code key={i} className={`rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-primary ${p.length <= 26 ? "whitespace-nowrap" : "break-words"}`}>
          {p.slice(1, -1)}
        </code>
      )
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>
    return <Fragment key={i}>{p}</Fragment>
  })
}

export const plain = (text: string) => text.replace(/`([^`]+)`/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1')
