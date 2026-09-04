import { useMemo, useState } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { usePayPeriods } from '../hooks/usePayPeriods'
import { useAccountBalances } from '../hooks/useAccounts'
import { CategoryChart, type CategorySlice } from '../components/CategoryChart'
import { MonthlyTrendChart, type MonthlyPoint } from '../components/MonthlyTrendChart'
import { SummaryCards } from '../components/SummaryCards'
import { Button } from '../components/ui/Button'
import { Input, Label } from '../components/ui/Input'
import { LoadingBlock, ErrorBanner } from '../components/ui/Feedback'
import { useToast } from '../hooks/useToast'
import { findPeriodFor } from '../lib/payPeriod'
import { formatDateShort } from '../lib/format'

/** Report spans, counted in payroll cycles rather than calendar months. */
const PRESETS = [
  { key: 1, label: 'Periode Ini' },
  { key: 3, label: '3 Periode' },
  { key: 6, label: '6 Periode' },
  { key: 12, label: '12 Periode' },
] as const

export default function Reports() {
  const { rangeFor } = usePayPeriods()
  const [presetCount, setPresetCount] = useState<number | 'custom'>(1)

  const presetSpan = presetCount === 'custom' ? null : rangeFor(presetCount)

  const [customFrom, setCustomFrom] = useState(() => rangeFor(1).from)
  const [customTo, setCustomTo] = useState(() => rangeFor(1).to)

  const from = presetSpan?.from ?? customFrom
  const to = presetSpan?.to ?? customTo

  const periodLabel =
    presetCount === 'custom'
      ? 'Custom'
      : presetCount === 1
        ? presetSpan!.periods[0].label
        : `${presetCount} Periode Gaji`

  const [breakdownType, setBreakdownType] = useState<'income' | 'expense'>('expense')
  const [exporting, setExporting] = useState(false)
  const { showToast } = useToast()
  const { balances } = useAccountBalances()

  const { data: transactions, isLoading, isError } = useTransactions({ from, to })

  const { totalIncome, totalExpense, monthlyPoints, expenseSlices, incomeSlices } = useMemo(() => {
    const list = transactions ?? []
    let income = 0
    let expense = 0
    const periodMap = new Map<string, MonthlyPoint>()
    const expenseMap = new Map<string, CategorySlice>()
    const incomeMap = new Map<string, CategorySlice>()

    // seed the buckets so periods with no activity still show on the chart
    const periods = presetSpan?.periods ?? []
    for (const p of [...periods].reverse()) {
      periodMap.set(p.key, { month: p.label.replace('Periode ', ''), income: 0, expense: 0 })
    }

    for (const t of list) {
      // transfers only shuffle money between the user's own accounts
      if (t.type === 'transfer') continue

      if (t.type === 'income') income += t.amount
      else expense += t.amount

      const period = findPeriodFor(t.transaction_date, periods)
      const bucketKey = period?.key ?? t.transaction_date.slice(0, 7)
      const point = periodMap.get(bucketKey) ?? {
        month: period ? period.label.replace('Periode ', '') : bucketKey,
        income: 0,
        expense: 0,
      }
      if (t.type === 'income') point.income += t.amount
      else point.expense += t.amount
      periodMap.set(bucketKey, point)

      const key = t.category?.name ?? 'Tanpa kategori'
      const map = t.type === 'income' ? incomeMap : expenseMap
      const existing = map.get(key)
      if (existing) existing.value += t.amount
      else map.set(key, { name: key, value: t.amount, color: t.category?.color ?? '#64748b' })
    }

    return {
      totalIncome: income,
      totalExpense: expense,
      monthlyPoints: Array.from(periodMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, v]) => v),
      expenseSlices: Array.from(expenseMap.values()).sort((a, b) => b.value - a.value),
      incomeSlices: Array.from(incomeMap.values()).sort((a, b) => b.value - a.value),
    }
  }, [transactions, presetSpan])

  async function handleExport() {
    if (!transactions) return
    if (transactions.length === 0) {
      showToast('Belum ada transaksi di periode ini', 'error')
      return
    }
    setExporting(true)
    try {
      const { exportReportToExcel } = await import('../lib/exportExcel')
      await exportReportToExcel({
        periodLabel,
        from,
        to,
        totalIncome,
        totalExpense,
        expenseByCategory: expenseSlices,
        incomeByCategory: incomeSlices,
        monthly: monthlyPoints.map((p) => ({
          month: p.month,
          income: p.income,
          expense: p.expense,
        })),
        accounts: balances.map((b) => ({
          name: b.account.name,
          balance: b.balance,
          color: b.account.color,
          kind: b.account.kind === 'savings' ? 'Simpanan / darurat' : 'Pengeluaran harian',
        })),
        transactions,
      })
      showToast('File Excel berhasil diunduh')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengekspor', 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Laporan</h2>
        <Button
          onClick={handleExport}
          disabled={exporting || isLoading || !transactions}
          className="!px-3 !py-2 text-xs"
        >
          {exporting ? 'Mengekspor…' : '⬇ Export Excel'}
        </Button>
      </div>

      <div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPresetCount(p.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                presetCount === p.key ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/50'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setPresetCount('custom')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              presetCount === 'custom' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/50'
            }`}
          >
            Custom
          </button>
        </div>
        <p className="mt-2 text-xs text-white/40">
          {formatDateShort(from)} – {formatDateShort(to)}
        </p>
      </div>

      {presetCount === 'custom' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="from">Dari</Label>
            <Input
              id="from"
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="to">Sampai</Label>
            <Input
              id="to"
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
        </div>
      )}

      {isLoading && <LoadingBlock />}
      {isError && <ErrorBanner message="Gagal memuat laporan. Coba sebentar lagi." />}

      {!isLoading && !isError && (
        <>
          <SummaryCards totalIncome={totalIncome} totalExpense={totalExpense} />

          <section>
            <h3 className="mb-3 text-sm font-semibold text-white/70">Tren per periode gaji</h3>
            <MonthlyTrendChart data={monthlyPoints} />
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white/70">Rincian per kategori</h3>
              <div className="inline-flex rounded-xl bg-white/5 p-1">
                {(['expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setBreakdownType(t)}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                      breakdownType === t ? 'bg-indigo-600 text-white' : 'text-white/50'
                    }`}
                  >
                    {t === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
                  </button>
                ))}
              </div>
            </div>
            <CategoryChart data={breakdownType === 'expense' ? expenseSlices : incomeSlices} />
          </section>
        </>
      )}
    </div>
  )
}
