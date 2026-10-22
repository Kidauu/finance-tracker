import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'

export type ToastTone = 'success' | 'error'

export interface Toast {
  id: number
  message: string
  tone: ToastTone
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextValue {
  showToast: (
    message: string,
    tone?: ToastTone,
    action?: { label: string; onClick: () => void },
  ) => void
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const DURATION_MS = 2800
const ACTION_DURATION_MS = 5000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback(
    (
      message: string,
      tone: ToastTone = 'success',
      action?: { label: string; onClick: () => void },
    ) => {
      setToasts((prev) => [...prev, { id: Date.now() + Math.random(), message, tone, action }])
    },
    [],
  )

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  useEffect(() => {
    if (toasts.length === 0) return
    const timer = setTimeout(
      () => setToasts((prev) => prev.slice(1)),
      toasts[0].action ? ACTION_DURATION_MS : DURATION_MS,
    )
    return () => clearTimeout(timer)
  }, [toasts])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[70] flex flex-col items-center gap-2 px-5">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto w-full max-w-sm rounded-2xl px-4 py-3 text-[13px] font-bold shadow-lg ${
              t.tone === 'success' ? 'bg-ink text-on-ink' : 'bg-expense text-white'
            }`}
          >
            <span>{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  dismissToast(t.id)
                  t.action?.onClick()
                }}
                className="ml-3 shrink-0 rounded-lg bg-white/15 px-2.5 py-1 text-[11px] font-extrabold text-inherit hover:bg-white/25"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
