import { useState, type FormEvent } from 'react'
import { useCategories } from '../hooks/useCategories'
import { useAccounts } from '../hooks/useAccounts'
import { useAddTransaction, useUpdateTransaction } from '../hooks/useTransactions'
import { useToast } from '../hooks/useToast'
import { Button } from './ui/Button'
import { Input, Label, Select } from './ui/Input'
import { CurrencyInput } from './ui/CurrencyInput'
import { formatDateShort, todayISO } from '../lib/format'
import type { TransactionType, TransactionWithCategory } from '../types'

interface TransactionFormPrefill {
  type?: TransactionType
  categoryId?: string
  accountId?: string
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

export function TransactionForm({ transaction, prefill, onSaved, onCancel }: TransactionFormProps) {
  const { data: categories } = useCategories()
  const { data: accounts } = useAccounts()
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
  const [toAccountId, setToAccountId] = useState(transaction?.to_account_id ?? '')
  const [date, setDate] = useState(transaction?.transaction_date ?? prefill?.date ?? todayISO())
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [error, setError] = useState<string | null>(null)

  const isTransfer = type === 'transfer'
  const filteredCategories = (categories ?? []).filter((c) => c.type === type)
  const isSaving = addTransaction.isPending || updateTransaction.isPending

  const today = todayISO()
  const dateShortcuts = [
    { label: 'Hari ini', value: today },
    { label: 'Kemarin', value: yesterdayISO() },
  ]

  function handleTypeChange(next: TransactionType) {
    setType(next)
    setCategoryId('')
    if (next !== 'transfer') setToAccountId('')
    else if (accounts && accounts.length > 1) {
      // preselect a destination that isn't the source
      const other = accounts.find((a) => a.id !== accountId)
      if (other) setToAccountId(other.id)
    }
  }

  async function handleSubmit(e: FormEvent) {
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

    try {
      const payload = {
        type,
        amount: numericAmount,
        category_id: isTransfer ? null : categoryId || null,
        account_id: accountId || null,
        to_account_id: isTransfer ? toAccountId : null,
        transaction_date: date,
        description: description || null,
      }

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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {prefill?.note && (
        <p className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2.5 text-sm text-indigo-200">
          {prefill.note}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {(['expense', 'income', 'transfer'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleTypeChange(t)}
            className={`rounded-xl py-2.5 text-sm font-medium transition-colors ${
              type === t ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/50'
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <div>
        <Label htmlFor="amount">Jumlah</Label>
        <CurrencyInput id="amount" value={amount} onChange={setAmount} autoFocus required />
      </div>

      <div>
        <Label htmlFor="account">{isTransfer ? 'Dari rekening' : 'Rekening'}</Label>
        <Select id="account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {!isTransfer && <option value="">Tanpa rekening</option>}
          {(accounts ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>

      {isTransfer && (
        <div>
          <Label htmlFor="to-account">Ke rekening</Label>
          <Select
            id="to-account"
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
          >
            <option value="">Pilih rekening tujuan</option>
            {(accounts ?? [])
              .filter((a) => a.id !== accountId)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </Select>
          <p className="mt-1.5 text-xs text-white/40">
            Transfer cuma mindahin saldo antar rekening — gak dihitung sebagai pemasukan atau
            pengeluaran.
          </p>
        </div>
      )}

      {!isTransfer && (
        <div>
          <Label htmlFor="category">Kategori</Label>
          <Select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Tanpa kategori</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <Label htmlFor="date" className="mb-0">
            Tanggal
          </Label>
          <div className="flex gap-1.5">
            {dateShortcuts.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setDate(s.value)}
                className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  date === s.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/5 text-white/50 hover:text-white/80'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        {date && date !== today && (
          <p className="mt-1.5 text-xs text-white/40">{formatDateShort(date)}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">Catatan</Label>
        <Input
          id="description"
          type="text"
          placeholder="Opsional"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="mt-1 flex gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Batal
        </Button>
        <Button type="submit" disabled={isSaving} className="flex-1">
          {isSaving ? 'Menyimpan…' : transaction ? 'Simpan perubahan' : 'Simpan'}
        </Button>
      </div>
    </form>
  )
}
