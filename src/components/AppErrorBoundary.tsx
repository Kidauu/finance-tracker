import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw, TriangleAlert } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * A route error must never leave the user with an empty dark screen. The
 * fallback keeps the recovery action local: no financial data is deleted.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the useful diagnostic in the browser console without sending the
    // user's financial data anywhere.
    console.error('Finance Tracker route failed to render', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-6 text-center">
        <div className="flex max-w-sm flex-col items-center gap-4 rounded-3xl border border-line bg-surface p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-expense-soft text-expense">
            <TriangleAlert size={21} />
          </span>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-base font-extrabold text-content">Halaman gagal dimuat</h1>
            <p className="text-[13px] leading-relaxed text-muted">
              Data kamu tetap aman. Muat ulang untuk mengambil versi aplikasi terbaru.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-bold text-on-ink"
          >
            <RefreshCw size={15} />
            Muat ulang
          </button>
        </div>
      </main>
    )
  }
}
