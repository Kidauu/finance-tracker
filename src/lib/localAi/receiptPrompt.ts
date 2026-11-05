/** Prompt + tolerant parser for the receipt draft. PoC: no schema validation yet (Fase 2). */

export interface ReceiptDraft {
  merchant: string | null
  transaction_date: string | null
  amount: number | null
  currency: 'IDR' | null
  type: 'expense'
  suggested_category: string | null
  evidence: { amount_text: string | null; date_text: string | null }
  warnings: string[]
}

export const RECEIPT_SYSTEM_PROMPT = `You read Indonesian shop receipts (struk) and output ONE JSON object, nothing else.
Rules:
- amount = the FINAL total paid (after discount, tax and service charge), integer rupiah. Indonesian numbers use "." or "," as thousand separators: "45.000" means 45000.
- transaction_date = YYYY-MM-DD, or null if not clearly readable.
- Never guess. If a value is unreadable use null and add a short note to warnings.
- If several numbers could be the total, pick the most likely one and explain in warnings.
- Do not infer the payment account.
- suggested_category is a short Indonesian label (e.g. "Kopi", "Makanan & Minuman", "Laundry") or null.
JSON shape:
{"merchant":string|null,"transaction_date":string|null,"amount":number|null,"currency":"IDR"|null,"type":"expense","suggested_category":string|null,"evidence":{"amount_text":string|null,"date_text":string|null},"warnings":string[]}`

export const RECEIPT_USER_PROMPT = 'Read this receipt and return the JSON object.'

/** Pulls the first JSON object out of a model reply (handles ```json fences). */
export function parseReceiptJson(raw: string): { value: unknown; error: string | null } {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end <= start) return { value: null, error: 'Tidak ada objek JSON di balasan model.' }
  try {
    return { value: JSON.parse(raw.slice(start, end + 1)), error: null }
  } catch (err) {
    return { value: null, error: 'JSON tidak valid: ' + (err instanceof Error ? err.message : String(err)) }
  }
}
