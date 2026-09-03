const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export function formatIDR(amount: number): string {
  return idrFormatter.format(amount)
}

const digitGrouper = new Intl.NumberFormat('id-ID')

/** "5000000" -> "5.000.000", for live-formatting amount fields as they're typed */
export function groupDigits(raw: string): string {
  if (!raw) return ''
  const n = Number(raw)
  return Number.isFinite(n) ? digitGrouper.format(n) : ''
}

/**
 * Formats a Date as YYYY-MM-DD in the *local* calendar. Never use
 * toISOString() for this — it converts to UTC first, so any timezone
 * ahead of UTC (WIB is +7) reports the previous day for dates near
 * midnight, which silently shifts paydays and month boundaries.
 */
export function toLocalISO(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayISO(): string {
  return toLocalISO(new Date())
}

export function monthStartISO(date = new Date()): string {
  return toLocalISO(new Date(date.getFullYear(), date.getMonth(), 1))
}

export function monthEndISO(date = new Date()): string {
  return toLocalISO(new Date(date.getFullYear(), date.getMonth() + 1, 0))
}

export function formatDateShort(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
