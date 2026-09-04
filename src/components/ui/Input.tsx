import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'

export function Label({ className = '', ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`mb-2 block text-xs font-bold text-label ${className}`} {...props} />
}

const fieldBase =
  'w-full rounded-2xl border border-line-input bg-surface px-4 text-[15px] text-content outline-none transition-colors placeholder:text-faint focus:border-accent'

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldBase} h-[52px] ${className}`} {...props} />
}

/** Input with a leading icon, matching the design's field treatment. */
export function IconInput({
  icon,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon: ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint">
        {icon}
      </span>
      <input className={`${fieldBase} h-[52px] !pl-11 ${className}`} {...props} />
    </div>
  )
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${fieldBase} h-[52px] ${className}`} {...props} />
}
