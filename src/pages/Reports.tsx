import { useCallback, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { useTransactions } from '../hooks/useTransactions'
import { usePayPeriods } from '../hooks/usePayPeriods'
import { useAccountBalances } from '../hooks/useAccounts'
import { useRegisterAddAction } from '../hooks/useAddAction'
import { CategoryChart, type CategorySlice } from '../components/CategoryChart'
import { MonthlyTrendChart, type MonthlyPoint } from '../components/MonthlyTrendChart'
import { SummaryCards } from '../components/SummaryCards'
import { TransactionForm } from '../components/TransactionForm'
import { Modal } from '../components/ui/Modal'
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
  const [formOpen, setFormOpen] = useState(false)
  const { showToast } = useToast()
  const { balances } = useAccountBalances()

  const openAdd = useCallback(() => setFormOpen(true), [])
  useRegisterAddAction(openAdd)

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
      else map.set(key, { name: key, value: t.amount, color: t.category?.color ?? '#8a8a80' })
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
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-extrabold tracking-tight text-content">Laporan</h1>
          <p className="text-[13px] text-muted">
            {formatDateShort(from)} – {formatDateShort(to)}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || isLoading || !transactions}
          className="flex items-center gap-1.5 rounded-[14px] border border-line-input bg-surface px-3.5 py-2.5 text-xs font-bold text-label disabled:opacity-50"
        >
          <Download size={14} />
          {exporting ? 'Ekspor…' : 'Excel'}
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPresetCount(p.key)}
            className={`rounded-full px-3.5 py-2 text-xs transition-colors ${
              presetCount === p.key
                ? 'bg-ink font-bold text-on-ink'
                : 'border border-line-input bg-surface font-semibold text-label'
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setPresetCount('custom')}
          className={`rounded-full px-3.5 py-2 text-xs transition-colors ${
            presetCount === 'custom'
              ? 'bg-ink font-bold text-on-ink'
              : 'border border-line-input bg-surface font-semibold text-label'
          }`}
        >
          Custom
        </button>
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
          <SummaryCards
            totalIncome={totalIncome}
            totalExpense={totalExpense}
            title="Selisih periode"
          />

          <MonthlyTrendChart data={monthlyPoints} />

          <section className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-extrabold text-content">Rincian per kategori</h2>
              <div className="flex gap-1 rounded-xl bg-surface-alt p-1">
                {(['expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setBreakdownType(t)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                      breakdownType === t ? 'bg-surface text-content' : 'text-muted'
                    }`}
                  >
                    {t === 'expense' ? 'Keluar' : 'Masuk'}
                  </button>
                ))}
              </div>
            </div>
            <CategoryChart data={breakdownType === 'expense' ? expenseSlices : incomeSlices} />
          </section>
        </>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Catat transaksi">
        <TransactionForm
          onSaved={() => setFormOpen(false)}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>
    </div>
  )
}
