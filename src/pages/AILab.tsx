import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/ui/Button'
import {
  checkCapability,
  LOCAL_AI_ENABLED,
  type AiCapability,
} from '../lib/localAi/capability'
import { prepareReceiptImage } from '../lib/localAi/receiptImage'
import { parseReceiptJson } from '../lib/localAi/receiptPrompt'
import { validateReceiptDraft } from '../lib/localAi/receiptDraft'
import { useCategories } from '../hooks/useCategories'

type Engine = typeof import('../lib/localAi/gemmaEngine')

// Diagnostic only: step names (never receipt content). If iOS kills the tab,
// the next visit reports the last step that started but never finished.
const CRUMB_KEY = 'ailab-last-step'
function crumb(step: string | null) {
  try {
    if (step) localStorage.setItem(CRUMB_KEY, step)
    else localStorage.removeItem(CRUMB_KEY)
  } catch {
    // storage may be blocked; diagnostics are best effort
  }
}
function takeCrumb(): string | null {
  try {
    const v = localStorage.getItem(CRUMB_KEY)
    localStorage.removeItem(CRUMB_KEY)
    return v
  } catch {
    return null
  }
}

interface RunLog {
  at: string
  label: string
  ms?: number
  ok: boolean
  note?: string
}

/** Developer-only lab for Fase 1: does Gemma 4 E2B run comfortably on this device? */
export default function AILab() {
  const [cap, setCap] = useState<AiCapability | null>(null)
  const [cached, setCached] = useState<boolean | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState<null | 'load' | 'analyze' | 'clear'>(null)
  const [progress, setProgress] = useState<{ progress: number; text: string } | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [raw, setRaw] = useState('')
  const [parsed, setParsed] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<RunLog[]>([])
  const engineRef = useRef<Engine | null>(null)
  const { data: categories } = useCategories()
  const [lastCrash] = useState<string | null>(() => (LOCAL_AI_ENABLED ? takeCrumb() : null))

  const addLog = (entry: Omit<RunLog, 'at'>) =>
    setLogs((prev) => [{ at: new Date().toLocaleTimeString('id-ID'), ...entry }, ...prev].slice(0, 30))

  async function getEngine(): Promise<Engine> {
    // dynamic import: the WebLLM runtime only loads when this lab is used
    engineRef.current ??= await import('../lib/localAi/gemmaEngine')
    return engineRef.current
  }

  async function checkDevice() {
    setError(null)
    crumb('cek perangkat (WebGPU)')
    const next = await checkCapability()
    setCap(next)
    crumb(null)
    return next
  }

  async function checkCache(modelId: string) {
    // this is the first step that imports the ~6MB WebLLM runtime
    crumb('memuat runtime WebLLM')
    try {
      setCached(await (await getEngine()).isModelCached(modelId))
    } catch (err) {
      setCached(null)
      setError('Cek cache gagal: ' + (err instanceof Error ? err.message : String(err)))
    }
    crumb(null)
  }

  async function refreshCapability() {
    const next = await checkDevice()
    if (next.modelId) await checkCache(next.modelId)
  }

  useEffect(() => {
    if (!LOCAL_AI_ENABLED) return
    // surface silent failures on screen instead of a blank page
    const onError = (e: ErrorEvent) => setError('Error: ' + e.message)
    const onRejection = (e: PromiseRejectionEvent) =>
      setError('Promise ditolak: ' + (e.reason instanceof Error ? e.reason.message : String(e.reason)))
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
      void engineRef.current?.unloadModel()
    }
  }, [])

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  if (!LOCAL_AI_ENABLED) {
    return (
      <main className="mx-auto max-w-md p-6 text-sm text-muted">
        AI Lab nonaktif. Set <code>VITE_LOCAL_RECEIPT_AI_ENABLED=true</code> untuk mengaktifkan.
      </main>
    )
  }

  async function onLoad() {
    if (!cap?.modelId) return
    setBusy('load')
    setError(null)
    setProgress({ progress: 0, text: 'Menyiapkan…' })
    try {
      crumb('download/muat model')
      const engine = await getEngine()
      const { ms } = await engine.loadModel(cap.modelId, setProgress)
      crumb(null)
      setLoaded(true)
      addLog({ label: cached ? 'Load model (dari cache)' : 'Download + load model', ms, ok: true })
      await refreshCapability()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      addLog({ label: 'Load model', ok: false, note: msg })
    } finally {
      setBusy(null)
    }
  }

  async function onPickFile(file: File | undefined) {
    if (!file || !loaded) return
    setBusy('analyze')
    setError(null)
    setRaw('')
    setParsed('')
    setPreview(URL.createObjectURL(file))
    try {
      crumb('resize foto')
      const img = await prepareReceiptImage(file)
      crumb('analisis foto')
      const engine = await getEngine()
      const res = await engine.analyzeReceipt(img.dataUrl)
      crumb(null)
      setRaw(res.raw)
      const { value, error: parseError } = parseReceiptJson(res.raw)
      if (parseError) setError(parseError)
      else {
        // show what the app would actually use, after validation
        setParsed(JSON.stringify(validateReceiptDraft(value, categories ?? []), null, 2))
      }
      addLog({
        label: `Analisis ${img.width}×${img.height} (${Math.round(img.bytes / 1024)}KB)`,
        ms: res.ms,
        ok: !parseError,
        note: `token ${res.promptTokens ?? '?'}→${res.completionTokens ?? '?'}${parseError ? ' · JSON gagal' : ''}`,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      addLog({ label: 'Analisis', ok: false, note: msg })
    } finally {
      setBusy(null)
    }
  }

  async function onClear() {
    if (!cap?.modelId) return
    setBusy('clear')
    try {
      await (await getEngine()).clearModelCache(cap.modelId)
      setLoaded(false)
      addLog({ label: 'Cache model dihapus', ok: true })
      await refreshCapability()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  const row = (label: string, value: string) => (
    <div className="flex justify-between gap-4 text-xs">
      <span className="text-muted">{label}</span>
      <span className="text-right font-bold text-content">{value}</span>
    </div>
  )

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <h1 className="text-lg font-extrabold text-content">AI Lab · Scan struk</h1>
      <p className="text-xs text-muted">
        Eksperimen Fase 1. Foto diproses di perangkat ini dan tidak dikirim ke server AI manapun.
        Tidak ada yang disimpan ke Supabase.
      </p>

      {lastCrash && (
        <p className="rounded-2xl bg-expense-soft p-3 text-xs font-bold text-expense">
          Sesi sebelumnya berhenti saat: {lastCrash}. Kirim info ini ke Claude.
        </p>
      )}

      <section className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-4">
        {row('WebGPU', cap ? (cap.webgpu ? 'ada' : 'tidak ada') : '…')}
        {row('shader-f16', cap ? (cap.shaderF16 ? 'ada' : 'tidak ada') : '…')}
        {row('Model', cap?.modelId ?? '—')}
        {row('Max buffer', cap?.maxBufferMB != null ? `${cap.maxBufferMB} MB` : '—')}
        {row(
          'Storage',
          cap?.storageUsedMB != null
            ? `${cap.storageUsedMB} / ${cap.storageQuotaMB ?? '?'} MB`
            : '—',
        )}
        {row('Model di cache', cached == null ? '—' : cached ? 'ya' : 'belum')}
        {cap?.reason && <p className="text-xs font-bold text-expense">{cap.reason}</p>}
      </section>

      {!cap && (
        <Button onClick={() => void checkDevice()} disabled={busy !== null}>
          1. Cek perangkat
        </Button>
      )}
      {cap?.modelId && cached === null && (
        <Button variant="secondary" onClick={() => void checkCache(cap.modelId!)} disabled={busy !== null}>
          2. Cek cache model
        </Button>
      )}

      {cap && !cap.webgpu ? (
        <p className="text-sm text-muted">
          Perangkat belum mendukung. Pakai <b>Catat manual</b> untuk mencatat transaksi.
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            {!loaded && (
              <>
                {!cached && (
                  <p className="text-xs text-muted">
                    Download model sekitar 2–3 GB dan butuh sekitar 3,4 GB VRAM. Pakai Wi-Fi.
                  </p>
                )}
                <Button onClick={onLoad} disabled={!cap?.modelId || busy !== null}>
                  {busy === 'load' ? 'Memuat…' : cached ? 'Muat model' : 'Download & muat model'}
                </Button>
              </>
            )}
            {busy === 'load' && progress && (
              <div className="flex flex-col gap-1.5">
                <div className="h-2 overflow-hidden rounded-full bg-surface-alt">
                  <div
                    className="h-full bg-accent transition-all"
                    style={{ width: `${Math.round(progress.progress * 100)}%` }}
                  />
                </div>
                <span className="text-[11px] text-muted">{progress.text}</span>
              </div>
            )}
            {loaded && (
              <label className="block">
                <span className="sr-only">Pilih foto struk</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  disabled={busy !== null}
                  onChange={(e) => {
                    void onPickFile(e.target.files?.[0])
                    e.target.value = ''
                  }}
                  className="block w-full text-xs"
                />
              </label>
            )}
            {busy === 'analyze' && <p className="text-xs font-bold text-accent">Membaca struk…</p>}
          </section>

          {preview && (
            <img src={preview} alt="Pratinjau struk" className="max-h-64 rounded-2xl object-contain" />
          )}
          {error && <p className="rounded-2xl bg-expense-soft p-3 text-xs font-bold text-expense">{error}</p>}
          {parsed && (
            <pre className="overflow-x-auto rounded-2xl bg-surface-alt p-3 text-[11px]">{parsed}</pre>
          )}
          {raw && (
            <details className="text-xs">
              <summary className="cursor-pointer font-bold text-muted">Balasan mentah</summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-surface-alt p-3">{raw}</pre>
            </details>
          )}

          <Button variant="secondary" onClick={onClear} disabled={busy !== null}>
            Bersihkan model & cache
          </Button>
        </>
      )}

      {logs.length > 0 && (
        <section className="flex flex-col gap-1 rounded-3xl border border-line bg-surface p-4">
          <span className="text-xs font-bold text-label">Log lokal</span>
          {logs.map((l, i) => (
            <div key={i} className={`text-[11px] ${l.ok ? 'text-content' : 'text-expense'}`}>
              {l.at} · {l.label}
              {l.ms != null && ` · ${(l.ms / 1000).toFixed(1)}s`}
              {l.note && ` · ${l.note}`}
            </div>
          ))}
        </section>
      )}
    </main>
  )
}
