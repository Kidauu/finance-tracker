import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useAddActionContext } from '../hooks/useAddAction'
import { AddActionProvider } from '../contexts/AddActionContext'
import { LoadingBlock } from './ui/Feedback'
import { Layout } from './Layout'

function LayoutWithAddAction({ children }: { children: ReactNode }) {
  const { handler } = useAddActionContext()
  return <Layout onAdd={handler ?? undefined}>{children}</Layout>
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <LoadingBlock label="Memeriksa sesi…" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return (
    <AddActionProvider>
      <LayoutWithAddAction>{children}</LayoutWithAddAction>
    </AddActionProvider>
  )
}
