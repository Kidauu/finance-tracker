import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Lock, Mail, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { IconInput, Label } from '../components/ui/Input'
import { ErrorBanner } from '../components/ui/Feedback'

export default function Login() {
  const { session, loading } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
        if (signUpError) throw signUpError
        if (!data.session) {
          setInfo('Cek inbox kamu buat konfirmasi email, terus login.')
          setMode('login')
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ada yang salah, coba lagi')
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
              Uangmu, rapi
              <br />
              tanpa ribet.
            </h1>
            <p className="text-sm leading-relaxed text-muted">
              {mode === 'login'
                ? 'Masuk dulu, nanti kita catat pengeluaran hari ini bareng.'
                : 'Bikin akun dulu, cuma butuh email sama kata sandi.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <IconInput
              id="email"
              type="email"
              autoComplete="email"
              placeholder="kamu@mail.com"
              icon={<Mail size={17} />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Kata sandi</Label>
            <IconInput
              id="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              icon={<Lock size={17} />}
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <ErrorBanner message={error} />}
          {info && (
            <p className="rounded-2xl bg-accent-soft px-4 py-3 text-[13px] leading-relaxed text-accent">
              {info}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="mt-2 !h-[54px] !py-0">
            {submitting ? 'Tunggu sebentar…' : mode === 'login' ? 'Masuk' : 'Daftar'}
          </Button>
        </form>

        <button
          className="text-center text-[13px] text-muted"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setError(null)
            setInfo(null)
          }}
        >
          {mode === 'login' ? 'Belum punya akun? ' : 'Udah punya akun? '}
          <span className="font-bold text-accent">
            {mode === 'login' ? 'Daftar gratis' : 'Masuk'}
          </span>
        </button>
      </div>
    </div>
  )
}
