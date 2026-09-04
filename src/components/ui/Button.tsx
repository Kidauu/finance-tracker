import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'ink'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:opacity-90 active:opacity-80',
  ink: 'bg-ink text-on-ink hover:opacity-90 active:opacity-80',
  secondary:
    'bg-surface text-content border border-line-input hover:bg-surface-alt active:bg-surface-alt',
  danger: 'bg-expense text-white hover:opacity-90 active:opacity-80',
  ghost: 'bg-transparent text-muted hover:bg-surface-alt active:bg-surface-alt',
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
}
