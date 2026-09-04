import { Inbox, TriangleAlert } from 'lucide-react'

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`h-5 w-5 animate-spin rounded-full border-2 border-line-strong border-t-accent ${className}`}
    />
  )
}

export function LoadingBlock({ label = 'Memuat…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <Spinner />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-line-strong bg-surface/50 px-6 py-12 text-center">
      <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-alt text-faint">
        <Inbox size={20} />
      </span>
      <p className="text-sm font-bold text-content">{title}</p>
      {description && <p className="max-w-xs text-[13px] leading-relaxed text-muted">{description}</p>}
    </div>
  )
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl bg-expense-soft px-4 py-3 text-[13px] leading-relaxed text-expense">
      <TriangleAlert size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
