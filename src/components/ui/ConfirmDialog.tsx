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
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <button aria-label="Batal" className="absolute inset-0 cursor-default" onClick={onCancel} />
      <div
        role="alertdialog"
        aria-modal="true"
        className="safe-bottom relative w-full max-w-sm rounded-2xl bg-[#17182a] p-5"
      >
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm text-white/60">{message}</p>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={onCancel} className="flex-1" disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
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
