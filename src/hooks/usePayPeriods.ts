import { useMemo } from 'react'
import { useHolidays } from './useHolidays'
import {
  currentPayPeriod,
  listPayPeriods,
  payPeriodRange,
  type PayPeriod,
} from '../lib/payPeriod'

/**
 * Payroll cycles derived from the user's holiday list, since holidays move
 * paydays and therefore the period boundaries.
 */
export function usePayPeriods(count = 12) {
  const { data: holidays, isLoading } = useHolidays()

  return useMemo(() => {
    const holidayDates = new Set((holidays ?? []).map((h) => h.holiday_date))
    const current = currentPayPeriod(holidayDates)
    const periods = listPayPeriods(count, holidayDates)
    return {
      holidayDates,
      current,
      periods,
      /** span covering the last `n` periods, for range queries */
      rangeFor: (n: number) => payPeriodRange(n, holidayDates),
      isLoading,
    }
  }, [holidays, count, isLoading])
}

export type { PayPeriod }
