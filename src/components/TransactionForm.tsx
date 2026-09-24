import { useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, ChevronDown, Pencil, TriangleAlert } from 'lucide-react'
import { useCategories } from '../hooks/useCategories'
import { useAccountBalances, useAccounts } from '../hooks/useAccounts'
import { useAddTransaction, useUpdateTransaction } from '../hooks/useTransactions'
import { useToast } from '../hooks/useToast'
import { Button } from './ui/Button'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { Input, Label, Select } from './ui/Input'
import { CurrencyInput } from './ui/CurrencyInput'
import { formatDateShort, formatIDR, todayISO } from '../lib/format'
import { iconForCategory } from '../lib/categoryIcons'
import type { NewTransaction, TransactionType, TransactionWithCategory } from '../types'

interface TransactionFormPrefill {
  type?: TransactionType
  categoryId?: string
  accountId?: string
  toAccountId?: string
  /** keeps a purpose-built transfer, such as an ATM withdrawal, on its intended route */
  lockTransferAccounts?: boolean
  date?: string
  /** shown above the form when the context isn't obvious, e.g. backfilling a past payday */
  note?: string
}

interface TransactionFormProps {
  transaction?: TransactionWithCategory
  prefill?: TransactionFormPrefill
  onSaved: () => void
  onCancel: () => void
}

const TYPE_LABELS: Record<TransactionType, string> = {
  expense: 'Keluar',
  income: 'Masuk',
  transfer: 'Transfer',
}

function yesterdayISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface BalanceChange {
  type: TransactionType
  amount: number
  account_id: string | null
  to_account_id: string | null
}

/** Adds (or reverses) a transaction's effect on the affected account balances. */
function applyBalanceChange(
  balances: Map<string, number>,
  transaction: BalanceChange,
  direction: 1 | -1,
) {
  const amount = transaction.amount * direction
  const change = (id: string | null, delta: number) => {
    if (id && balances.has(id)) balances.set(id, (balances.get(id) ?? 0) + delta)
  }

  if (transaction.type === 'income') change(transaction.account_id, amount)
  else if (transaction.type === 'expense') change(transaction.account_id, -amount)
  else {
    change(transaction.account_id, -amount)
    change(transaction.to_account_id, amount)
  }
}

export function TransactionForm({ transaction, prefill, onSaved, onCancel }: TransactionFormProps) {
  const { data: categories } = useCategories()
  const { data: accounts } = useAccounts()
  const { balances } = useAccountBalances()
  const addTransaction = useAddTransaction()
  const updateTransaction = useUpdateTransaction()
  const { showToast } = useToast()

  const defaultAccountId =
    transaction?.account_id ??
    prefill?.accountId ??
    (accounts ?? []).find((a) => !a.is_payroll)?.id ??
    (accounts ?? [])[0]?.id ??
    ''

  const [type, setType] = useState<TransactionType>(transaction?.type ?? prefill?.type ?? 'expense')
  const [amount, setAmount] = useState(transaction ? String(Math.round(transaction.amount)) : '')
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? prefill?.categoryId ?? '')
  const [accountId, setAccountId] = useState(defaultAccountId)
  const [toAccountId, setToAccountId] = useState(
    transaction?.to_account_id ?? prefill?.toAccountId ?? '',
  )
  const [date, setDate] = useState(transaction?.transaction_date ?? prefill?.date ?? todayISO())
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [overdraftConfirmOpen, setOverdraftConfirmOpen] = useState(false)

  const isTransfer = type === 'transfer'
  const transferAccountsLocked =
    isTransfer && prefill?.lockTransferAccounts === true && transaction === undefined
  const filteredCategories = (categories ?? []).filter((c) => c.type === type)
  const isSaving = addTransaction.isPending || updateTransaction.isPending

  /**
   * A draft is simulated against the live balances. When editing, we first
   * undo the saved transaction so an unchanged record never warns falsely.
   */
  const overdrawnAccounts = useMemo(() => {
    const projected = new Map(balances.map((b) => [b.account.id, b.balance]))
    if (transaction) applyBalanceChange(projected, transaction, -1)

    const numericAmount = Number(amount)
    if (numericAmount > 0) {
      applyBalanceChange(
        projected,
        {
          type,
          amount: numericAmount,
          account_id: accountId || null,
          to_account_id: isTransfer ? toAccountId || null : null,
        },
        1,
      )
    }

    // Only flag balances that this draft would lower. An unrelated account
    // that was already negative should not block a new transaction elsewhere.
    return balances.flatMap((b) => {
      const next = projected.get(b.account.id) ?? b.balance
      return next < 0 && next < b.balance
        ? [{ account: b.account, projectedBalance: next }]
        : []
    })
  }, [accountId, amount, balances, isTransfer, toAccountId, transaction, type])

  const today = todayISO()
  const dateShortcuts = [
    { label: 'Hari ini', value: today },
    { label: 'Kemarin', value: yesterdayISO() },
  ]

  // the design shows a compact icon grid; the rest stay behind "Lainnya"
  const QUICK_COUNT = 7
  const visibleCategories = showAllCategories
    ? filteredCategories
    : filteredCategories.slice(0, QUICK_COUNT)

  function handleTypeChange(next: TransactionType) {
    setType(next)
    setCategoryId('')
    if (next !== 'transfer') setToAccountId('')
    else if (accounts && accounts.length > 1) {
      const other = accounts.find((a) => a.id !== accountId)
      if (other) setToAccountId(other.id)
    }
  }

  function payloadFor(numericAmount: number): NewTransaction {
    return {
      type,
      amount: numericAmount,
      category_id: isTransfer ? null : categoryId || null,
      account_id: accountId || null,
      to_account_id: isTransfer ? toAccountId : null,
      transaction_date: date,
      description: description || null,
    }
  }

  async function saveTransaction(payload: NewTransaction) {
    try {
      if (transaction) {
        await updateTransaction.mutateAsync({ id: transaction.id, ...payload })
        showToast('Transaksi diperbarui')
      } else {
        await addTransaction.mutateAsync(payload)
        showToast(
          isTransfer
            ? 'Transfer dicatat'
            : type === 'income'
              ? 'Pemasukan dicatat'
              : 'Pengeluaran dicatat',
        )
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ada yang salah, coba lagi')
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const numericAmount = Number(amount)
    if (!numericAmount || numericAmount <= 0) {
      setError('Jumlah harus lebih dari 0')
      return
    }
    if (!date) {
      setError('Tanggal wajib diisi')
      return
    }
    if (isTransfer) {
      if (!accountId || !toAccountId) {
        setError('Pilih rekening asal dan tujuan')
        return
      }
      if (accountId === toAccountId) {
        setError('Rekening asal dan tujuan harus berbeda')
        return
      }
    }

    if (overdrawnAccounts.length > 0) {
      setOverdraftConfirmOpen(true)
      return
    }

    void saveTransaction(payloadFor(numericAmount))
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {prefill?.note && (
        <p className="rounded-2xl bg-accent-soft px-4 py-3 text-[13px] leading-relaxed text-accent">
          {prefill.note}
        </p>
      )}

      <div className="flex gap-1.5 rounded-2xl bg-surface-alt p-1.5">
        {(['expense', 'income', 'transfer'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleTypeChange(t)}
            className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-colors ${
              type === t ? 'bg-surface text-content shadow-sm' : 'text-muted'
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <CurrencyInput
        id="amount"
        value={amount}
        onChange={setAmount}
        autoFocus
        required
        hero
        heroLabel="Berapa?"
      />

      {!isTransfer && filteredCategories.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <Label className="mb-0">Kategori</Label>
          <div className="grid grid-cols-4 gap-2">
            {visibleCategories.map((c) => {
              const Icon = iconForCategory(c.name)
              const selected = categoryId === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(selected ? '' : c.id)}
                  style={
                    selected ? { borderColor: c.color, color: c.color } : undefined
                  }
                  className={`flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 transition-colors ${
                    selected
                      ? 'border-[1.5px] bg-surface-alt'
                      : 'border border-line bg-surface text-muted'
                  }`}
                >
                  <Icon size={17} />
                  <span className="w-full truncate px-1 text-[10px] font-semibold leading-tight">
                    {c.name}
                  </span>
                </button>
              )
            })}
            {!showAllCategories && filteredCategories.length > QUICK_COUNT && (
              <button
                type="button"
                onClick={() => setShowAllCategories(true)}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-surface px-1 py-3 text-muted"
              >
                <ChevronDown size={17} />
                <span className="text-[10px] font-semibold leading-tight">Lainnya</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2.5">
        <div className="flex flex-1 flex-col gap-1.5 rounded-2xl border border-line bg-surface px-3.5 py-3">
          <span className="text-[11px] font-bold text-muted">
            {isTransfer ? 'Dari rekening' : 'Rekening'}
          </span>
          <Select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            disabled={transferAccountsLocked}
            className="!h-auto !rounded-none !border-0 !bg-transparent !p-0 !text-[13px] !font-bold"
          >
            {!isTransfer && <option value="">Tanpa rekening</option>}
            {(accounts ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>

        {isTransfer ? (
          <div className="flex flex-1 flex-col gap-1.5 rounded-2xl border border-line bg-surface px-3.5 py-3">
            <span className="text-[11px] font-bold text-muted">Ke rekening</span>
            <Select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              disabled={transferAccountsLocked}
              className="!h-auto !rounded-none !border-0 !bg-transparent !p-0 !text-[13px] !font-bold"
            >
              <option value="">Pilih…</option>
              {(accounts ?? [])
                .filter((a) => a.id !== accountId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </Select>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-1.5 rounded-2xl border border-line bg-surface px-3.5 py-3">
            <span className="flex items-center justify-between text-[11px] font-bold text-muted">
              Tanggal
              <CalendarDays size={13} className="text-faint" />
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full border-0 bg-transparent p-0 text-[13px] font-bold text-content outline-none"
            />
          </div>
        )}
      </div>

      {isTransfer && (
        <>
          <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface px-3.5 py-3">
            <span className="flex items-center justify-between text-[11px] font-bold text-muted">
              Tanggal
              <CalendarDays size={13} className="text-faint" />
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full border-0 bg-transparent p-0 text-[13px] font-bold text-content outline-none"
            />
          </div>
          <p className="-mt-1 text-[11px] leading-relaxed text-muted">
            Transfer cuma mindahin saldo antar rekening — gak dihitung sebagai pemasukan atau
            pengeluaran.
          </p>
        </>
      )}

      <div className="flex gap-1.5">
        {dateShortcuts.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setDate(s.value)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
              date === s.value ? 'bg-accent text-on-accent' : 'bg-surface-alt text-muted'
            }`}
          >
            {s.label}
          </button>
        ))}
        {date !== today && (
          <span className="self-center px-1 text-[11px] text-faint">{formatDateShort(date)}</span>
        )}
      </div>

      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint">
          <Pencil size={15} />
        </span>
        <Input
          id="description"
          type="text"
          placeholder="Catatan singkat (opsional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="!h-12 !border-dashed !pl-11 !text-[13px]"
        />
      </div>

      {error && <p className="text-[13px] font-medium text-expense">{error}</p>}

      {overdrawnAccounts.length > 0 && (
        <div className="flex gap-2.5 rounded-2xl bg-expense-soft px-3.5 py-3 text-[12px] leading-relaxed text-expense">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          <p>
            {overdrawnAccounts
              .map(
                (b) =>
                  b.account.name + ' akan menjadi ' + formatIDR(b.projectedBalance),
              )
              .join('. ')}
          </p>
        </div>
      )}

      <div className="mt-1 flex gap-2.5">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Batal
        </Button>
        <Button type="submit" disabled={isSaving} className="flex-[1.4] !h-[54px] !py-0">
          {isSaving
            ? 'Menyimpan…'
            : Number(amount) > 0
              ? `Simpan · ${formatIDR(Number(amount))}`
              : 'Simpan'}
        </Button>
      </div>

      <ConfirmDialog
        open={overdraftConfirmOpen}
        title="Saldo rekening akan minus"
        message={
          overdrawnAccounts.length === 1
            ? 'Saldo ' +
              overdrawnAccounts[0].account.name +
              ' tidak cukup untuk transaksi ini. Tetap simpan kalau saldo di aplikasi memang belum disesuaikan.'
            : 'Ada saldo rekening yang tidak cukup untuk transaksi ini. Tetap simpan kalau saldo di aplikasi memang belum disesuaikan.'
        }
        confirmLabel="Tetap simpan"
        destructive={false}
        busy={isSaving}
        onConfirm={() => {
          setOverdraftConfirmOpen(false)
          void saveTransaction(payloadFor(Number(amount)))
        }}
        onCancel={() => setOverdraftConfirmOpen(false)}
      />
    </form>
  )
}
