import { useMemo } from 'react'
import { useCategories } from './useCategories'
import { useHolidays } from './useHolidays'
import { useTransactions } from './useTransactions'
import { payPeriodForMonth } from '../lib/payPeriod'
import { toLocalISO, todayISO } from '../lib/format'
import type { TransactionWithCategory } from '../types'

export interface PaydayMonth {
  /** first day of the month, YYYY-MM-DD — stable key */
  monthStart: string
  /** e.g. "Agustus 2026" */
  label: string
  /** the adjusted payday for this month — also the start of its spending cycle */
  payday: string
  /** last day this salary covers: the day before the next payday */
  periodEnd: string
  /** total already logged in the Gaji category for this month */
  loggedAmount: number | null
  /** the logged transaction, so the row can jump straight to editing it */
  transaction: TransactionWithCategory | null
  /** payday has already passed */
  isPast: boolean
  isCurrentMonth: boolean
  /** today falls inside this salary's spending window */
  isActiveCycle: boolean
}

const MONTHS_BACK = 12

/**
 * Builds the recent payday calendar so past months can be backfilled, not
 * just the current one. A month counts as "recorded" when any income
 * transaction in the Gaji category falls inside that calendar month —
 * matching the month rather than the exact payday date, since the money
 * sometimes lands a day off from the computed date.
 */
export function usePaydayHistory(monthsBack = MONTHS_BACK) {
  const { data: categories } = useCategories()
  const { data: holidays } = useHolidays()

  const rangeStart = useMemo(() => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - (monthsBack - 1))
    return toLocalISO(d)
  }, [monthsBack])

  const { data: transactions, isLoading } = useTransactions({ from: rangeStart })

  const gajiCategory = useMemo(
    () => (categories ?? []).find((c) => c.type === 'income' && c.name === 'Gaji'),
    [categories],
  )

  const months = useMemo<PaydayMonth[]>(() => {
    const holidayDates = new Set((holidays ?? []).map((h) => h.holiday_date))
    const today = todayISO()
    const now = new Date()
    const currentMonthStart = toLocalISO(new Date(now.getFullYear(), now.getMonth(), 1))

    const byMonth = new Map<string, TransactionWithCategory>()
    const totalByMonth = new Map<string, number>()
    if (gajiCategory) {
      for (const t of transactions ?? []) {
        if (t.category_id !== gajiCategory.id) continue
        const key = t.transaction_date.slice(0, 7)
        totalByMonth.set(key, (totalByMonth.get(key) ?? 0) + t.amount)
        if (!byMonth.has(key)) byMonth.set(key, t)
      }
    }

    const result: PaydayMonth[] = []
    for (let i = 0; i < monthsBack; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStart = toLocalISO(d)
      const monthKey = monthStart.slice(0, 7)
      const period = payPeriodForMonth(d.getFullYear(), d.getMonth(), holidayDates)
      const payday = period.start

      result.push({
        monthStart,
        label: d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
        payday,
        periodEnd: period.end,
        loggedAmount: totalByMonth.get(monthKey) ?? null,
        transaction: byMonth.get(monthKey) ?? null,
        isPast: payday <= today,
        isCurrentMonth: monthStart === currentMonthStart,
        isActiveCycle: today >= payday && today <= period.end,
      })
    }
    return result
  }, [transactions, holidays, gajiCategory, monthsBack])

  const unrecordedPastCount = months.filter((m) => m.isPast && m.loggedAmount === null).length

  return { months, gajiCategory, isLoading, unrecordedPastCount }
}
