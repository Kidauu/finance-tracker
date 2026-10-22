import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { KeyRound, Lock, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { IconInput } from '../components/ui/Input'
import { ErrorBanner, LoadingBlock } from '../components/ui/Feedback'

export default function ResetPassword() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) return <LoadingBlock label="Memeriksa link pemulihan…" />
  if (!session) return <Navigate to="/login" replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('Password baru minimal 6 karakter')
      return
    }
    if (password !== confirmation) {
      setError('Konfirmasi password belum sama')
      return
    }

    setSubmitting(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center bg-bg px-7 py-10">
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-4">
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-[18px] bg-accent text-on-accent">
            <Wallet size={24} />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-content">
              Buat password baru.
            </h1>
            <p className="text-sm leading-relaxed text-muted">
              Pilih password yang baru untuk masuk ke Finance Tracker.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <IconInput
            id="new-password"
            type="password"
            autoComplete="new-password"
            placeholder="Password baru"
            icon={<Lock size={17} />}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
          <IconInput
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="Ulangi password baru"
            icon={<KeyRound size={17} />}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            minLength={6}
            required
          />
          {error && <ErrorBanner message={error} />}
          <Button type="submit" disabled={submitting} className="mt-2 !h-[54px] !py-0">
            {submitting ? 'Memperbarui…' : 'Simpan password baru'}
          </Button>
        </form>
      </div>
    </div>
  )
}
