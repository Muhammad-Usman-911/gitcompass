import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'secondary' | 'outline' | 'ghost' | 'gradient' | 'destructive'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<Variant, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'border bg-card shadow-glass backdrop-blur-xl hover:bg-secondary',
  ghost: 'hover:bg-secondary/70',
  gradient: 'btn-gloss text-white hover:brightness-110 hover:-translate-y-px',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
}
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-9 w-9',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = 'default', size = 'md', ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-xl font-semibold transition-all active:scale-[.98] disabled:pointer-events-none disabled:opacity-50',
      variants[variant],
      sizes[size],
      className,
    )}
    {...props}
  />
))
Button.displayName = 'Button'

export const buttonClass = (variant: Variant = 'default', size: Size = 'md', className?: string) =>
  cn('inline-flex items-center justify-center whitespace-nowrap rounded-xl font-semibold transition-all active:scale-[.98]', variants[variant], sizes[size], className)
