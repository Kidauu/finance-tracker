import { useCallback, useMemo, useState } from 'react'
import { ArrowDownUp, Search, Tags } from 'lucide-react'
import { useTransactions } from '../hooks/useTransactions'
import { useRegisterAddAction } from '../hooks/useAddAction'
import { TransactionList } from '../components/TransactionList'
import { TransactionForm } from '../components/TransactionForm'
import { CategoryManager } from '../components/CategoryManager'
import { Modal } from '../components/ui/Modal'
import { IconInput } from '../components/ui/Input'
import { LoadingBlock, ErrorBanner } from '../components/ui/Feedback'
import { formatIDR } from '../lib/format'
import type { TransactionType, TransactionWithCategory } from '../types'

type Filter = 'all' | TransactionType

const FILTER_LABELS: Record<Filter, string> = {
  all: 'Semua',
  expense: 'Keluar',
  income: 'Masuk',
  transfer: 'Transfer',
}

export default function Transactions() {
  const { data: transactions, isLoading, isError } = useTransactions()
  const [sortAsc, setSortAsc] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [editing, setEditing] = useState<TransactionWithCategory | undefined>(undefined)

  const visible = useMemo(() => {
    let list = transactions ?? []
    if (filter !== 'all') list = list.filter((t) => t.type === filter)

    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((t) =>
        [t.description, t.category?.name, t.account?.name, t.to_account?.name]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(q)),
      )
    }
    return sortAsc ? [...list].reverse() : list
  }, [transactions, sortAsc, filter, query])

  const spentThisList = useMemo(
    () => visible.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [visible],
  )

  const openAdd = useCallback(() => {
    setEditing(undefined)
    setFormOpen(true)
  }, [])

  useRegisterAddAction(openAdd)

  function openEdit(t: TransactionWithCategory) {
    setEditing(t)
    setFormOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-extrabold tracking-tight text-content">Transaksi</h1>
          <p className="text-[13px] text-muted">
            {visible.length} catatan · keluar {formatIDR(spentThisList)}
          </p>
        </div>
        <button
          onClick={() => setCategoriesOpen(true)}
          aria-label="Kelola kategori"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[13px] border border-line-input bg-surface text-label"
        >
          <Tags size={16} />
        </button>
      </header>

      <IconInput
        icon={<Search size={16} />}
        placeholder="Cari catatan, kategori, rekening…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="!h-[46px] !rounded-2xl !text-sm"
      />

      <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
        {(['all', 'expense', 'income', 'transfer'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${
              filter === f
                ? 'bg-ink text-on-ink'
                : 'border border-line-input bg-surface font-semibold text-label'
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
        <button
          onClick={() => setSortAsc((v) => !v)}
          aria-label="Ubah urutan"
          className="ml-auto flex shrink-0 items-center gap-1 rounded-full border border-line-input bg-surface px-3 py-2 text-xs font-semibold text-label"
        >
          <ArrowDownUp size={13} />
          {sortAsc ? 'Terlama' : 'Terbaru'}
        </button>
      </div>

      {isLoading && <LoadingBlock />}
      {isError && <ErrorBanner message="Gagal memuat transaksi. Coba sebentar lagi." />}

      {!isLoading && !isError && <TransactionList transactions={visible} onEdit={openEdit} />}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Ubah transaksi' : 'Catat transaksi'}
      >
        <TransactionForm
          key={editing?.id ?? 'new'}
          transaction={editing}
          onSaved={() => setFormOpen(false)}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      <Modal open={categoriesOpen} onClose={() => setCategoriesOpen(false)} title="Kategori">
        <CategoryManager />
      </Modal>
    </div>
  )
}
