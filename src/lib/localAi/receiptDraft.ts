/**
 * App-side validation of what the model returned. The model only drafts; this
 * code decides what is trustworthy. It never writes anything — the existing
 * transaction form's Simpan stays the only path to Supabase.
 */
import { toLocalISO } from '../format'
import type { Category } from '../../types'

export const MAX_RECEIPT_AMOUNT = 100_000_000 // Rp100 juta: above this it is almost surely a misread
const MAX_AGE_DAYS = 400

export interface ValidatedReceiptDraft {
  merchant: string | null
  /** YYYY-MM-DD or null */
  date: string | null
  /** positive integer rupiah or null */
  amount: number | null
  /** id of one of the user's expense categories, or null */
  categoryId: string | null
  categoryName: string | null
  evidence: { amountText: string | null; dateText: string | null }
  /** model warnings + warnings added by validation; show them in the review screen */
  warnings: string[]
  /** true when amount is missing/invalid, so the user must type it */
  needsAmount: boolean
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const str = (v: unknown, max = 80): string | null => {
  if (typeof v !== 'string') return null
  const t = v.replace(/\s+/g, ' ').trim()
  return t ? t.slice(0, max) : null
}

/** "45.000" / "Rp 45,000" / 45000 / "45000.00" -> 45000. Returns null if ambiguous. */
export function parseRupiah(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && Number.isInteger(value) ? value : null
  }
  if (typeof value !== 'string') return null
  const cleaned = value.replace(/rp|idr|\s/gi, '')
  if (!/^\d[\d.,]*$/.test(cleaned)) return null
  // trailing ",00"/".00" are fake decimals on rupiah receipts
  const noDecimals = cleaned.replace(/[.,]00$/, '')
  // after that every separator must be a thousands separator (groups of 3)
  if (/[.,]/.test(noDecimals) && !/^\d{1,3}([.,]\d{3})+$/.test(noDecimals)) return null
  return Number(noDecimals.replace(/[.,]/g, ''))
}

function validDate(value: unknown, today: Date): { date: string | null; warning: string | null } {
  const raw = str(value, 10)
  if (!raw) return { date: null, warning: null }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  if (!m) return { date: null, warning: `Format tanggal tidak dikenali: "${raw}".` }
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const parsed = new Date(y, mo - 1, d)
  if (parsed.getFullYear() !== y || parsed.getMonth() !== mo - 1 || parsed.getDate() !== d) {
    return { date: null, warning: `Tanggal tidak valid: "${raw}".` }
  }
  const iso = toLocalISO(parsed)
  if (iso > toLocalISO(today)) return { date: null, warning: `Tanggal ${iso} ada di masa depan.` }
  const ageDays = (today.getTime() - parsed.getTime()) / 86_400_000
  if (ageDays > MAX_AGE_DAYS) return { date: null, warning: `Tanggal ${iso} terlalu lama.` }
  return { date: iso, warning: null }
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** Maps the model's suggestion onto the user's own expense categories; falls back to "Lainnya". */
export function matchCategory(
  suggestion: string | null,
  categories: Category[],
): { id: string; name: string } | null {
  const expense = categories.filter((c) => c.type === 'expense')
  if (suggestion) {
    const want = norm(suggestion)
    const hit = expense.find((c) => norm(c.name) === want)
    if (hit) return { id: hit.id, name: hit.name }
  }
  const fallback = expense.find((c) => norm(c.name) === 'lainnya')
  return fallback ? { id: fallback.id, name: fallback.name } : null
}

export function validateReceiptDraft(
  input: unknown,
  categories: Category[],
  today: Date = new Date(),
): ValidatedReceiptDraft {
  const warnings: string[] = []
  const obj = isRecord(input) ? input : {}
  if (!isRecord(input)) warnings.push('Balasan model bukan objek JSON yang valid.')

  if (Array.isArray(obj.warnings)) {
    for (const w of obj.warnings.slice(0, 5)) {
      const t = str(w, 160)
      if (t) warnings.push(t)
    }
  }

  let amount = parseRupiah(obj.amount)
  if (obj.amount != null && amount === null) {
    warnings.push('Nominal tidak terbaca dengan jelas, isi manual.')
  }
  if (amount !== null && amount <= 0) {
    amount = null
    warnings.push('Nominal harus lebih dari nol.')
  }
  if (amount !== null && amount > MAX_RECEIPT_AMOUNT) {
    warnings.push('Nominal sangat besar, periksa lagi struknya.')
    amount = null
  }

  const evidence = isRecord(obj.evidence) ? obj.evidence : {}
  const amountText = str(evidence.amount_text, 40)
  // cross-check: if the model quoted the text it read, it must agree with the number
  if (amount !== null && amountText) {
    const fromText = parseRupiah(amountText)
    if (fromText !== null && fromText !== amount) {
      warnings.push(`Nominal (${amount}) tidak sama dengan teks struk ("${amountText}").`)
    }
  }

  const { date, warning: dateWarning } = validDate(obj.transaction_date, today)
  if (dateWarning) warnings.push(dateWarning)

  const cat = matchCategory(str(obj.suggested_category, 40), categories)
  if (!cat) warnings.push('Kategori belum cocok, pilih manual.')

  return {
    merchant: str(obj.merchant, 60),
    date,
    amount,
    categoryId: cat?.id ?? null,
    categoryName: cat?.name ?? null,
    evidence: { amountText, dateText: str(evidence.date_text, 40) },
    warnings: [...new Set(warnings)],
    needsAmount: amount === null,
  }
}
