import { useEffect, useRef, useState } from 'react'
import { Camera, TriangleAlert } from 'lucide-react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Input, Label, Select } from './ui/Input'
import { useCategories } from '../hooks/useCategories'
import { useAccounts } from '../hooks/useAccounts'
import { checkCapability, type AiCapability } from '../lib/localAi/capability'
import { prepareReceiptImage } from '../lib/localAi/receiptImage'
import { parseReceiptJson } from '../lib/localAi/receiptPrompt'
import { validateReceiptDraft } from '../lib/localAi/receiptDraft'
import { formatIDR } from '../lib/format'

type Engine = typeof import('../lib/localAi/gemmaEngine')

export interface ReceiptDraftResult {
  amount: string
  date: string
  categoryId: string
  accountId: string
  description: string
}

interface ReceiptScanModalProps {
  open: boolean
  onClose: () => void
  /** Gunakan draft: only fills the form. Saving stays with the form's Simpan. */
  onUseDraft: (draft: ReceiptDraftResult) => void
}

type Step = 'check' | 'unsupported' | 'download' | 'loading' | 'pick' | 'reading' | 'review'

interface Review {
  merchant: string
  amount: string
  date: string
  categoryId: string
  accountId: string
  warnings: string[]
  photo: string
}

export function ReceiptScanModal({ open, onClose, onUseDraft }: ReceiptScanModalProps) {
  const { data: categories } = useCategories()
  const { data: accounts } = useAccounts()
  const [step, setStep] = useState<Step>('check')
  const [cap, setCap] = useState<AiCapability | null>(null)
  const [progress, setProgress] = useState({ progress: 0, text: '' })
  const [error, setError] = useState<string | null>(null)
  const [review, setReview] = useState<Review | null>(null)
  const engineRef = useRef<Engine | null>(null)
  const photoRef = useRef<string | null>(null)
  // bumped whenever the modal closes so a late model reply can't reopen a stale review
  const runRef = useRef(0)

  const expenseCategories = (categories ?? []).filter((c) => c.type === 'expense')

  async function engine(): Promise<Engine> {
    engineRef.current ??= await import('../lib/localAi/gemmaEngine')
    return engineRef.current
  }

  function dropPhoto() {
    if (photoRef.current) URL.revokeObjectURL(photoRef.current)
    photoRef.current = null
  }

  async function loadModel(modelId: string) {
    setStep('loading')
    setError(null)
    const run = runRef.current
    try {
      await (await engine()).loadModel(modelId, setProgress)
      if (run === runRef.current) setStep('pick')
    } catch (err) {
      if (run !== runRef.current) return
      setError(err instanceof Error ? err.message : String(err))
      setStep('download')
    }
  }

  // open: check the device; if the model is already on disk go straight to loading it
  useEffect(() => {
    if (!open) return
    const run = ++runRef.current
    setStep('check')
    setError(null)
    setReview(null)
    void (async () => {
      const next = await checkCapability()
      if (run !== runRef.current) return
      setCap(next)
      if (!next.modelId) return setStep('unsupported')
      const eng = await engine()
      if (run !== runRef.current) return
      if (eng.isModelLoaded()) return setStep('pick')
      if (await eng.isModelCached(next.modelId)) return void loadModel(next.modelId)
      setStep('download')
    })()
    // loadModel is stable enough for this one-shot effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function close() {
    runRef.current++
    dropPhoto()
    setReview(null)
    // free GPU memory; the weights stay cached on disk for next time
    void engineRef.current?.unloadModel()
    onClose()
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return
    const run = runRef.current
    dropPhoto()
    photoRef.current = URL.createObjectURL(file)
    setStep('reading')
    setError(null)
    try {
      const img = await prepareReceiptImage(file)
      const res = await (await engine()).analyzeReceipt(img.dataUrl)
      if (run !== runRef.current) return
      const { value, error: parseError } = parseReceiptJson(res.raw)
      if (parseError) throw new Error(parseError)
      const d = validateReceiptDraft(value, categories ?? [])
      setReview({
        merchant: d.merchant ?? '',
        amount: d.amount != null ? String(d.amount) : '',
        date: d.date ?? '',
        categoryId: d.categoryId ?? '',
        accountId: '', // never guessed from the photo — the user must pick
        warnings: d.warnings,
        photo: photoRef.current ?? '',
      })
      setStep('review')
    } catch (err) {
      if (run !== runRef.current) return
      setError(err instanceof Error ? err.message : String(err))
      dropPhoto()
      setStep('pick')
    }
  }

  const patch = (p: Partial<Review>) => setReview((r) => (r ? { ...r, ...p } : r))
  const amountNumber = Number(review?.amount ?? 0)
  const canUse = !!review && amountNumber > 0 && !!review.date && !!review.accountId

  function useDraft() {
    if (!review || !canUse) return
    onUseDraft({
      amount: String(Math.round(amountNumber)),
      date: review.date,
      categoryId: review.categoryId,
      accountId: review.accountId,
      description: review.merchant,
    })
    close()
  }

  const manual = (
    <Button type="button" variant="secondary" onClick={close} className="w-full">
      Catat manual
    </Button>
  )

  return (
    <Modal open={open} onClose={close} title="Scan struk">
      <div className="flex flex-col gap-4">
        <p className="text-xs leading-relaxed text-muted">
          Struk dibaca di perangkat ini dan tidak dikirim ke server AI. Hasilnya hanya draft,
          belum tersimpan sampai lu tekan Simpan di form.
        </p>

        {step === 'check' && <p className="text-sm text-muted">Memeriksa perangkat…</p>}

        {step === 'unsupported' && (
          <>
            <p className="text-sm text-muted">
              {cap?.reason ?? 'Perangkat ini belum mendukung scan struk.'}
            </p>
            {manual}
          </>
        )}

        {step === 'download' && (
          <>
            {error && <p className="text-xs font-bold text-expense">{error}</p>}
            <p className="text-sm text-muted">
              Model AI perlu diunduh sekali, sekitar 2–3 GB. Pakai Wi-Fi dan pastikan storage
              lega. Selama proses, jangan tutup aplikasi.
            </p>
            <Button type="button" onClick={() => cap?.modelId && void loadModel(cap.modelId)}>
              Download model
            </Button>
            {manual}
          </>
        )}

        {step === 'loading' && (
          <div className="flex flex-col gap-2">
            <div className="h-2 overflow-hidden rounded-full bg-surface-alt">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${Math.round(progress.progress * 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-muted">{progress.text || 'Memuat model…'}</span>
            <Button type="button" variant="secondary" onClick={close}>
              Batal
            </Button>
          </div>
        )}

        {step === 'pick' && (
          <>
            {error && (
              <p className="rounded-2xl bg-expense-soft p-3 text-xs font-bold text-expense">
                Gagal membaca struk: {error}
              </p>
            )}
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-bold text-on-accent">
              <Camera size={16} />
              Ambil / pilih foto struk
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  void onPhoto(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </label>
            {manual}
          </>
        )}

        {step === 'reading' && (
          <>
            <p className="text-sm font-bold text-accent">Membaca struk…</p>
            <Button type="button" variant="secondary" onClick={close}>
              Batal
            </Button>
          </>
        )}

        {step === 'review' && review && (
          <>
            {review.photo && (
              <img src={review.photo} alt="Struk" className="max-h-40 rounded-2xl object-contain" />
            )}
            {review.warnings.length > 0 && (
              <div className="flex gap-2.5 rounded-2xl bg-expense-soft px-3.5 py-3 text-[12px] leading-relaxed text-expense">
                <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                <ul className="list-disc pl-3">
                  {review.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <Label htmlFor="scan-merchant">Merchant</Label>
              <Input
                id="scan-merchant"
                value={review.merchant}
                onChange={(e) => patch({ merchant: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="scan-amount">Nominal (Rp)</Label>
              <Input
                id="scan-amount"
                inputMode="numeric"
                value={review.amount}
                onChange={(e) => patch({ amount: e.target.value.replace(/\D/g, '') })}
              />
              {amountNumber > 0 && (
                <span className="text-[11px] text-muted">{formatIDR(amountNumber)}</span>
              )}
            </div>
            <div>
              <Label htmlFor="scan-date">Tanggal</Label>
              <Input
                id="scan-date"
                type="date"
                value={review.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="scan-category">Kategori</Label>
              <Select
                id="scan-category"
                value={review.categoryId}
                onChange={(e) => patch({ categoryId: e.target.value })}
              >
                <option value="">Pilih…</option>
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="scan-account">Rekening (wajib dipilih)</Label>
              <Select
                id="scan-account"
                value={review.accountId}
                onChange={(e) => patch({ accountId: e.target.value })}
              >
                <option value="">Pilih rekening…</option>
                {(accounts ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex gap-2.5">
              <Button type="button" variant="secondary" onClick={close} className="flex-1">
                Batal
              </Button>
              <Button type="button" onClick={useDraft} disabled={!canUse} className="flex-[1.4]">
                Gunakan draft
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
