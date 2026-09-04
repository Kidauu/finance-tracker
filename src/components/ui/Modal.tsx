import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <button aria-label="Tutup" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className="safe-bottom relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[32px] border-t border-line bg-bg px-5 pb-6 pt-5 sm:m-4 sm:rounded-[32px] sm:border">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-extrabold tracking-tight text-content">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-alt text-label hover:opacity-80"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
