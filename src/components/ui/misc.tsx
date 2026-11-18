import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border bg-card text-card-foreground', className)} {...p} />
}

export function Badge({ className, color, children }: { className?: string; color?: string; children: ReactNode }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium', className)}
      style={color ? { color, borderColor: `${color}55`, background: `${color}14` } : undefined}
    >
      {children}
    </span>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{children}</kbd>
}

export const levelColor = { beginner: '#34d399', intermediate: '#fbbf24', advanced: '#f87171' } as const
