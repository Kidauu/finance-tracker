import { budgetPace } from './budgetPace'
import type { BudgetWithCategory, TransactionWithCategory } from '../types'

export type InsightTone = 'warning' | 'pace' | 'trend'

export interface MoneyInsight {
  tone: InsightTone
  title: string
  detail: string
}

interface InsightInput {
  transactions: TransactionWithCategory[]
  previousTransactions: TransactionWithCategory[]
  budgets: BudgetWithCategory[]
  periodStart: string
  periodEnd: string
  today: string
}

interface CategorySpend {
  name: string
  amount: number
}

function expensesByCategory(transactions: TransactionWithCategory[]) {
  const totals = new Map<string, CategorySpend>()
  for (const transaction of transactions) {
    if (transaction.type !== 'expense' || !transaction.category_id) continue
    const existing = totals.get(transaction.category_id)
    if (existing) existing.amount += transaction.amount
    else {
      totals.set(transaction.category_id, {
        name: transaction.category?.name ?? 'Tanpa kategori',
        amount: transaction.amount,
      })
    }
  }
  return totals
}

const rupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)

/**
 * Produces a deliberately small, actionable set of observations. It never
 * guesses at causes: every sentence is directly derived from transactions and
 * a pot allocation, so the dashboard stays trustworthy.
 */
export function buildMoneyInsights({
  transactions,
  previousTransactions,
  budgets,
  periodStart,
  periodEnd,
  today,
}: InsightInput): MoneyInsight[] {
  const current = expensesByCategory(transactions)
  const previous = expensesByCategory(previousTransactions)
  const insights: MoneyInsight[] = []

  const budgetStates = budgets
    .filter((budget) => budget.monthly_amount > 0)
    .map((budget) => {
      const spent = current.get(budget.category_id)?.amount ?? 0
      return {
        budget,
        spent,
        pace: budgetPace(budget.monthly_amount, spent, periodStart, periodEnd, today),
      }
    })

  const over = budgetStates
    .filter(({ pace }) => pace.remaining < 0)
    .sort((a, b) => a.pace.remaining - b.pace.remaining)[0]
  if (over) {
    insights.push({
      tone: 'warning',
      title: `${over.budget.category?.name ?? 'Pot ini'} melewati jatah`,
      detail: `Lebih ${rupiah(Math.abs(over.pace.remaining))} pada periode ini.`,
    })
  }

  // The pot with the largest share used is the one worth watching first.
  // An already-over-budget pot is covered by the more urgent warning above.
  const tightest = budgetStates
    .filter(({ spent, pace }) => spent > 0 && pace.safeDaily !== null && pace.remaining >= 0)
    .sort((a, b) => b.spent / b.budget.monthly_amount - a.spent / a.budget.monthly_amount)[0]
  if (tightest && tightest.pace.safeDaily !== null) {
    insights.push({
      tone: 'pace',
      title: `${tightest.budget.category?.name ?? 'Pot ini'}: aman ${rupiah(tightest.pace.safeDaily)}/hari`,
      detail: `Sisa ${rupiah(tightest.pace.remaining)} untuk ${tightest.pace.daysRemaining} hari lagi.`,
    })
  }

  const biggestRise = Array.from(current.entries())
    .map(([categoryId, currentSpend]) => {
      const previousSpend = previous.get(categoryId)?.amount ?? 0
      return { ...currentSpend, previousSpend, rise: currentSpend.amount - previousSpend }
    })
    .filter(({ previousSpend, rise }) => previousSpend > 0 && rise > 0)
    .sort((a, b) => b.rise - a.rise)[0]
  if (biggestRise) {
    const pct = Math.round((biggestRise.rise / biggestRise.previousSpend) * 100)
    insights.push({
      tone: 'trend',
      title: `${biggestRise.name} naik ${pct}%`,
      detail: `${rupiah(biggestRise.amount)} vs ${rupiah(biggestRise.previousSpend)} periode lalu.`,
    })
  }

  return insights.slice(0, 3)
}
