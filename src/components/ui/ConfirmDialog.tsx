import { TriangleAlert } from 'lucide-react'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  destructive = true,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <button aria-label="Batal" className="absolute inset-0 cursor-default" onClick={onCancel} />
      <div
        role="alertdialog"
        aria-modal="true"
        className="safe-bottom relative w-full max-w-sm rounded-[28px] border border-line bg-bg p-5"
      >
        {destructive && (
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-expense-soft text-expense">
            <TriangleAlert size={18} />
          </span>
        )}
        <h2 className="text-base font-extrabold tracking-tight text-content">{title}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">{message}</p>
        <div className="mt-5 flex gap-2.5">
          <Button type="button" variant="secondary" onClick={onCancel} className="flex-1" disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            className="flex-1"
            disabled={busy}
          >
            {busy ? 'Menghapus…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
