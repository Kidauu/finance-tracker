import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import { useTransactions } from '../hooks/useTransactions'
import { useSeedDefaultCategories } from '../hooks/useCategories'
import { usePaydayHistory, type PaydayMonth } from '../hooks/usePaydayHistory'
import { usePayPeriods } from '../hooks/usePayPeriods'
import { useAccountBalances } from '../hooks/useAccounts'
import { useAuth } from '../hooks/useAuth'
import { useRegisterAddAction } from '../hooks/useAddAction'
import { SummaryCards } from '../components/SummaryCards'
import { CategoryChart, type CategorySlice } from '../components/CategoryChart'
import { TransactionList } from '../components/TransactionList'
import { TransactionForm } from '../components/TransactionForm'
import { PaydayPanel } from '../components/PaydayPanel'
import { HolidayManager } from '../components/HolidayManager'
import { AccountBalances } from '../components/AccountBalances'
import { AccountManager } from '../components/AccountManager'
import { Modal } from '../components/ui/Modal'
import { LoadingBlock, ErrorBanner } from '../components/ui/Feedback'
import { formatDateShort } from '../lib/format'
import type { TransactionType, TransactionWithCategory } from '../types'

interface Prefill {
  type: TransactionType
  categoryId?: string
  accountId?: string
  toAccountId?: string
  lockTransferAccounts?: boolean
  date?: string
  note?: string
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 19) return 'Selamat sore'
  return 'Selamat malam'
}

// keep this in sync with usePaydayHistory's default — the payday panel and
// the period navigator need to agree on which months are reachable
const PERIOD_HISTORY = 12

export default function Dashboard() {
  useSeedDefaultCategories(true)

  const { periods } = usePayPeriods(PERIOD_HISTORY)
  const [viewAll, setViewAll] = useState(false)
  // 0 = current period, 1 = one period back, etc. — periods[] is newest-first
  const [periodOffset, setPeriodOffset] = useState(0)
  const viewedPeriod = periods[periodOffset] ?? periods[0]
  const isCurrentPeriod = periodOffset === 0

  const range = viewAll || !viewedPeriod ? undefined : { from: viewedPeriod.start, to: viewedPeriod.end }
  const { data: transactions, isLoading, isError } = useTransactions(range)
  const { months, gajiCategory, unrecordedPastCount } = usePaydayHistory(PERIOD_HISTORY)
  const { balances, totalBalance } = useAccountBalances()
  const { signOut } = useAuth()
  const cashAccount = balances.find((b) => b.account.name.trim().toLowerCase() === 'cash')?.account
  const bcaAccount =
    balances.find((b) => b.account.name.trim().toLowerCase() === 'bca')?.account ??
    balances.find((b) => b.account.is_payroll)?.account

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
        map.set(key, { name: key, value: t.amount, color: t.category?.color ?? '#8a8a80' })
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

  const openAdd = useCallback(() => {
    setEditing(undefined)
    setPrefill(undefined)
    setFormOpen(true)
  }, [])

  useRegisterAddAction(openAdd)

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

  function openCashWithdrawal() {
    if (!bcaAccount || !cashAccount) return

    setEditing(undefined)
    setPrefill({
      type: 'transfer',
      accountId: bcaAccount.id,
      toAccountId: cashAccount.id,
      lockTransferAccounts: true,
      note: 'Penarikan tunai dari BCA ke Cash. Ini memindahkan saldo, bukan pengeluaran.',
    })
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

  // periods[] is newest-first, so "older" moves the offset up and "newer" down
  function goToOlderPeriod() {
    setViewAll(false)
    setPeriodOffset((i) => Math.min(i + 1, periods.length - 1))
  }

  function goToNewerPeriod() {
    setViewAll(false)
    setPeriodOffset((i) => Math.max(i - 1, 0))
  }

  function viewPaydayMonth(month: PaydayMonth) {
    const monthKey = month.monthStart.slice(0, 7)
    const index = periods.findIndex((p) => p.key === monthKey)
    if (index === -1) return
    setViewAll(false)
    setPeriodOffset(index)
  }

  const net = totalIncome - totalExpense
  const status = viewAll
    ? 'Semua catatan kamu'
    : !viewedPeriod
      ? 'Memuat periode…'
      : isCurrentPeriod
        ? net >= 0
          ? 'Periode ini masih aman'
          : 'Periode ini lagi minus'
        : `${viewedPeriod.monthLabel} · ${net >= 0 ? 'surplus' : 'minus'}`

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] text-muted">{greeting()}</span>
          <h1 className="text-[17px] font-extrabold tracking-tight text-content">{status}</h1>
        </div>
        <button
          onClick={() => signOut()}
          aria-label="Keluar"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[13px] border border-line-input bg-surface text-label"
        >
          <LogOut size={16} />
        </button>
      </header>

      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-1 rounded-2xl bg-surface-alt p-1.5">
          <button
            onClick={goToOlderPeriod}
            disabled={viewAll || periodOffset >= periods.length - 1}
            aria-label="Periode sebelumnya"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setViewAll(false)}
            className={`flex-1 truncate rounded-xl py-1.5 text-xs font-bold transition-colors ${
              !viewAll ? 'bg-surface text-content shadow-sm' : 'text-muted'
            }`}
          >
            {viewedPeriod?.label ?? '…'}
          </button>
          <button
            onClick={goToNewerPeriod}
            disabled={viewAll || isCurrentPeriod}
            aria-label="Periode berikutnya"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <button
          onClick={() => setViewAll(true)}
          className={`shrink-0 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-colors ${
            viewAll ? 'bg-ink text-on-ink' : 'bg-surface-alt text-muted'
          }`}
        >
          Semua
        </button>
      </div>

      {isLoading && <LoadingBlock />}
      {isError && <ErrorBanner message="Gagal memuat transaksi. Coba sebentar lagi." />}

      {!isLoading && !isError && (
        <>
          <SummaryCards
            totalIncome={totalIncome}
            totalExpense={totalExpense}
            periodLabel={
              !viewAll && viewedPeriod
                ? `${formatDateShort(viewedPeriod.start).replace(/ \d{4}$/, '')} – ${formatDateShort(viewedPeriod.end).replace(/ \d{4}$/, '')}`
                : undefined
            }
          />

          <AccountBalances
            balances={balances}
            totalBalance={totalBalance}
            onManage={() => setAccountsOpen(true)}
            onTransfer={openTransfer}
            onCashWithdrawal={bcaAccount && cashAccount ? openCashWithdrawal : undefined}
          />

          <PaydayPanel
            months={months}
            unrecordedPastCount={unrecordedPastCount}
            onRecord={openPaydayRecord}
            onEdit={openPaydayEdit}
            onManageHolidays={() => setHolidaysOpen(true)}
            onViewPeriod={viewPaydayMonth}
          />

          <section className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-extrabold text-content">Ke mana uangnya</h2>
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

          <section className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-extrabold text-content">Transaksi terbaru</h2>
              <Link to="/transactions" className="text-xs font-bold text-accent">
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
        title={
          editing
            ? 'Ubah transaksi'
            : prefill?.type === 'transfer'
              ? 'Transfer antar rekening'
              : prefill?.type === 'income'
                ? 'Catat pemasukan'
                : 'Catat pengeluaran'
        }
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
