/**
 * Turns a pot's period allocation into a useful spending pace. Dates are ISO
 * calendar dates, so calculations deliberately stay in UTC-day space rather
 * than letting the device timezone move a day around midnight.
 */
function utcDay(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number)
  return Date.UTC(year, month - 1, day) / 86_400_000
}

export interface BudgetPace {
  remaining: number
  daysRemaining: number
  safeDaily: number | null
}

/**
 * Days remaining includes today: with Rp70.000 left and seven calendar days
 * left in the pay cycle, Rp10.000 is still safe to spend today.
 */
export function budgetPace(
  allocated: number,
  spent: number,
  periodStart: string,
  periodEnd: string,
  today: string,
): BudgetPace {
  const remaining = allocated - spent
  const start = utcDay(periodStart)
  const end = utcDay(periodEnd)
  const current = utcDay(today)

  const daysRemaining =
    current < start ? end - start + 1 : current > end ? 0 : end - current + 1

  return {
    remaining,
    daysRemaining,
    safeDaily: remaining > 0 && daysRemaining > 0 ? remaining / daysRemaining : null,
  }
}
