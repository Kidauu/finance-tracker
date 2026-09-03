import { computePayday } from './payday'
import { toLocalISO } from './format'

/**
 * A payroll cycle: from one payday up to the day before the next one.
 * The salary paid on 28 Aug funds spending until 27 Sep, so this — not the
 * calendar month — is the window every total, pot, and report is measured over.
 */
export interface PayPeriod {
  /** month of the payday that opens the period, "YYYY-MM" */
  key: string
  /** payday, inclusive */
  start: string
  /** day before the next payday, inclusive */
  end: string
  /** "Periode Agustus" */
  label: string
  /** "Agustus 2026" */
  monthLabel: string
}

function shiftDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toLocalISO(d)
}

/** The period opened by the payday of the given month. Month may overflow (-1, 12). */
export function payPeriodForMonth(
  year: number,
  month: number,
  holidayDates: Set<string>,
): PayPeriod {
  const start = computePayday(year, month, holidayDates)
  const nextStart = computePayday(year, month + 1, holidayDates)
  const anchor = new Date(year, month, 1)

  return {
    key: `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}`,
    start,
    end: shiftDays(nextStart, -1),
    label: `Periode ${anchor.toLocaleDateString('id-ID', { month: 'long' })}`,
    monthLabel: anchor.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
  }
}

/** The period that contains the given date — i.e. the cycle you're spending in now. */
export function currentPayPeriod(holidayDates: Set<string>, date = new Date()): PayPeriod {
  const iso = toLocalISO(date)
  const paydayThisMonth = computePayday(date.getFullYear(), date.getMonth(), holidayDates)
  const monthOffset = iso >= paydayThisMonth ? 0 : -1
  return payPeriodForMonth(date.getFullYear(), date.getMonth() + monthOffset, holidayDates)
}

/** Recent periods, newest first, starting from the one containing `date`. */
export function listPayPeriods(
  count: number,
  holidayDates: Set<string>,
  date = new Date(),
): PayPeriod[] {
  const current = currentPayPeriod(holidayDates, date)
  const [year, month1] = current.key.split('-').map(Number)
  const periods: PayPeriod[] = []
  for (let i = 0; i < count; i++) {
    periods.push(payPeriodForMonth(year, month1 - 1 - i, holidayDates))
  }
  return periods
}

/** Span covering `count` periods back from the current one, for range queries. */
export function payPeriodRange(
  count: number,
  holidayDates: Set<string>,
  date = new Date(),
): { from: string; to: string; periods: PayPeriod[] } {
  const periods = listPayPeriods(count, holidayDates, date)
  return {
    from: periods[periods.length - 1].start,
    to: periods[0].end,
    periods,
  }
}

/** Which of `periods` contains `iso`; null when it falls outside all of them. */
export function findPeriodFor(iso: string, periods: PayPeriod[]): PayPeriod | null {
  return periods.find((p) => iso >= p.start && iso <= p.end) ?? null
}
