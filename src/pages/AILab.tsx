import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/ui/Button'
import {
  checkCapability,
  LOCAL_AI_ENABLED,
  type AiCapability,
} from '../lib/localAi/capability'
import { prepareReceiptImage } from '../lib/localAi/receiptImage'
import { parseReceiptJson } from '../lib/localAi/receiptPrompt'

type Engine = typeof import('../lib/localAi/gemmaEngine')

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

  const addLog = (entry: Omit<RunLog, 'at'>) =>
    setLogs((prev) => [{ at: new Date().toLocaleTimeString('id-ID'), ...entry }, ...prev].slice(0, 30))

  async function getEngine(): Promise<Engine> {
    // dynamic import: the WebLLM runtime only loads when this lab is used
    engineRef.current ??= await import('../lib/localAi/gemmaEngine')
    return engineRef.current
  }

  async function refreshCapability() {
    const next = await checkCapability()
    setCap(next)
    if (next.modelId) {
      try {
        setCached(await (await getEngine()).isModelCached(next.modelId))
      } catch {
        setCached(null)
      }
    }
  }

  useEffect(() => {
    if (!LOCAL_AI_ENABLED) return
    void refreshCapability()
    return () => {
      void engineRef.current?.unloadModel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const engine = await getEngine()
      const { ms } = await engine.loadModel(cap.modelId, setProgress)
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
      const img = await prepareReceiptImage(file)
      const engine = await getEngine()
      const res = await engine.analyzeReceipt(img.dataUrl)
      setRaw(res.raw)
      const { value, error: parseError } = parseReceiptJson(res.raw)
      if (parseError) setError(parseError)
      else setParsed(JSON.stringify(value, null, 2))
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
