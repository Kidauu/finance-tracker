import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTransactions } from '../hooks/useTransactions'
import { useSeedDefaultCategories } from '../hooks/useCategories'
import { usePaydayHistory, type PaydayMonth } from '../hooks/usePaydayHistory'
import { usePayPeriods } from '../hooks/usePayPeriods'
import { useAccountBalances } from '../hooks/useAccounts'
import { AccountBalances } from '../components/AccountBalances'
import { AccountManager } from '../components/AccountManager'
import { SummaryCards } from '../components/SummaryCards'
import { CategoryChart, type CategorySlice } from '../components/CategoryChart'
import { TransactionList } from '../components/TransactionList'
import { TransactionForm } from '../components/TransactionForm'
import { PaydayPanel } from '../components/PaydayPanel'
import { HolidayManager } from '../components/HolidayManager'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { LoadingBlock, ErrorBanner } from '../components/ui/Feedback'
import { formatDateShort } from '../lib/format'
import type { TransactionType, TransactionWithCategory } from '../types'

interface Prefill {
  type: TransactionType
  categoryId?: string
  accountId?: string
  date?: string
  note?: string
}

export default function Dashboard() {
  useSeedDefaultCategories(true)

  const [period, setPeriod] = useState<'cycle' | 'all'>('cycle')
  const { current: cycle } = usePayPeriods()
  const range = period === 'cycle' ? { from: cycle.start, to: cycle.end } : undefined
  const { data: transactions, isLoading, isError } = useTransactions(range)
  const { months, gajiCategory, unrecordedPastCount } = usePaydayHistory()
  const { balances, totalBalance } = useAccountBalances()

  const [formOpen, setFormOpen] = useState(false)
  const [holidaysOpen, setHolidaysOpen] = useState(false)
  const [accountsOpen, setAccountsOpen] = useState(false)
  const [editing, setEditing] = useState<TransactionWithCategory | undefined>(undefined)
  const [prefill, setPrefill] = useState<Prefill | undefined>(undefined)
  const [breakdownType, setBreakdownType] = useState<'income' | 'expense'>('expense')

  const { totalIncome, totalExpense, expenseSlices, incomeSlices } = useMemo(() => {
    const list = transactions ?? []
    let income = 0
    let expense = 0
    const expenseByCategory = new Map<string, CategorySlice>()
    const incomeByCategory = new Map<string, CategorySlice>()

    for (const t of list) {
      // transfers just move money between the user's own accounts — counting
      // them here would inflate both income and expense
      if (t.type === 'transfer') continue

      const key = t.category?.name ?? 'Tanpa kategori'
      const map = t.type === 'income' ? incomeByCategory : expenseByCategory
      const existing = map.get(key)
      if (existing) {
        existing.value += t.amount
      } else {
        map.set(key, { name: key, value: t.amount, color: t.category?.color ?? '#64748b' })
      }
      if (t.type === 'income') income += t.amount
      else expense += t.amount
    }

    return {
      totalIncome: income,
      totalExpense: expense,
      expenseSlices: Array.from(expenseByCategory.values()).sort((a, b) => b.value - a.value),
      incomeSlices: Array.from(incomeByCategory.values()).sort((a, b) => b.value - a.value),
    }
  }, [transactions])

  function openAdd() {
    setEditing(undefined)
    setPrefill(undefined)
    setFormOpen(true)
  }

  function openEdit(t: TransactionWithCategory) {
    setEditing(t)
    setPrefill(undefined)
    setFormOpen(true)
  }

  function openTransfer() {
    setEditing(undefined)
    setPrefill({ type: 'transfer' })
    setFormOpen(true)
  }

  function openPaydayRecord(month: PaydayMonth) {
    const payrollAccount = balances.find((b) => b.account.is_payroll)?.account
    setEditing(undefined)
    setPrefill({
      type: 'income',
      categoryId: gajiCategory?.id,
      accountId: payrollAccount?.id,
      date: month.payday,
      note: `Mencatat gaji ${month.label}${payrollAccount ? ` — masuk ke ${payrollAccount.name}` : ''}`,
    })
    setFormOpen(true)
  }

  function openPaydayEdit(month: PaydayMonth) {
    if (!month.transaction) return
    setEditing(month.transaction)
    setPrefill(undefined)
    setFormOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-xl bg-white/5 p-1">
          {(['cycle', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                period === p ? 'bg-indigo-600 text-white' : 'text-white/50'
              }`}
            >
              {p === 'cycle' ? cycle.label : 'Semua'}
            </button>
          ))}
        </div>
        <Button onClick={openAdd} className="!px-3 !py-2">
          + Tambah
        </Button>
      </div>

      {period === 'cycle' && (
        <p className="-mt-4 text-xs text-white/40">
          {formatDateShort(cycle.start)} – {formatDateShort(cycle.end)} · sejak gajian sampai
          sehari sebelum gajian berikutnya
        </p>
      )}

      <AccountBalances
        balances={balances}
        totalBalance={totalBalance}
        onManage={() => setAccountsOpen(true)}
        onTransfer={openTransfer}
      />

      <PaydayPanel
        months={months}
        unrecordedPastCount={unrecordedPastCount}
        onRecord={openPaydayRecord}
        onEdit={openPaydayEdit}
        onManageHolidays={() => setHolidaysOpen(true)}
      />

      {isLoading && <LoadingBlock />}
      {isError && <ErrorBanner message="Gagal memuat transaksi. Coba sebentar lagi." />}

      {!isLoading && !isError && (
        <>
          <SummaryCards totalIncome={totalIncome} totalExpense={totalExpense} />

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white/70">Rincian</h2>
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

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white/70">Transaksi terbaru</h2>
              <Link to="/transactions" className="text-xs text-indigo-400 hover:text-indigo-300">
                Lihat semua
              </Link>
            </div>
            <TransactionList transactions={(transactions ?? []).slice(0, 5)} onEdit={openEdit} />
          </section>
        </>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Ubah transaksi' : 'Tambah transaksi'}
      >
        <TransactionForm
          key={editing?.id ?? `${prefill?.type ?? ''}-${prefill?.date ?? 'new'}`}
          transaction={editing}
          prefill={prefill}
          onSaved={() => setFormOpen(false)}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      <Modal open={holidaysOpen} onClose={() => setHolidaysOpen(false)} title="Hari libur">
        <HolidayManager />
      </Modal>

      <Modal open={accountsOpen} onClose={() => setAccountsOpen(false)} title="Rekening">
        <AccountManager />
      </Modal>
    </div>
  )
}
