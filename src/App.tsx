import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoadingBlock } from './components/ui/Feedback'
import { UpdatePrompt } from './components/UpdatePrompt'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { LOCAL_AI_ENABLED } from './lib/localAi/capability'

const Login = lazy(() => import('./pages/Login'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Transactions = lazy(() => import('./pages/Transactions'))
const Budgets = lazy(() => import('./pages/Budgets'))
const Reports = lazy(() => import('./pages/Reports'))
const AILab = lazy(() => import('./pages/AILab'))

/** An unmatched URL must never leave a blank (black) screen, e.g. a stale cached app shell. */
function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6 text-center">
      <div className="flex max-w-sm flex-col gap-3 rounded-3xl border border-line bg-surface p-6">
        <h1 className="text-base font-extrabold text-content">Halaman tidak ditemukan</h1>
        <p className="break-all text-[13px] leading-relaxed text-muted">
          {window.location.pathname}
          {window.location.pathname === '/ai-lab' && !LOCAL_AI_ENABLED
            ? ' — fitur Scan struk nonaktif di versi aplikasi ini (flag mati atau versi lama masih tersimpan).'
            : ''}
        </p>
        <a href="/" className="rounded-2xl bg-ink px-4 py-3 text-sm font-bold text-on-ink">
          Ke beranda
        </a>
      </div>
    </main>
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UpdatePrompt />
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense
              fallback={
                <div className="flex min-h-screen items-center justify-center bg-bg">
                  <LoadingBlock />
                </div>
              }
            >
              <AppErrorBoundary>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/transactions"
                    element={
                      <ProtectedRoute>
                        <Transactions />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/budgets"
                    element={
                      <ProtectedRoute>
                        <Budgets />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <ProtectedRoute>
                        <Reports />
                      </ProtectedRoute>
                    }
                  />
                  {LOCAL_AI_ENABLED && (
                    <Route
                      path="/ai-lab"
                      element={
                        <ProtectedRoute>
                          <AILab />
                        </ProtectedRoute>
                      }
                    />
                  )}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppErrorBoundary>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
