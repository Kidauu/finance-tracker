import { useMemo, useState } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { TransactionList } from '../components/TransactionList'
import { TransactionForm } from '../components/TransactionForm'
import { CategoryManager } from '../components/CategoryManager'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { LoadingBlock, ErrorBanner } from '../components/ui/Feedback'
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

  const [formOpen, setFormOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [editing, setEditing] = useState<TransactionWithCategory | undefined>(undefined)

  const visible = useMemo(() => {
    let list = transactions ?? []
    if (filter !== 'all') list = list.filter((t) => t.type === filter)
    return sortAsc ? [...list].reverse() : list
  }, [transactions, sortAsc, filter])

  function openAdd() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(t: TransactionWithCategory) {
    setEditing(t)
    setFormOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Transaksi</h2>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setCategoriesOpen(true)}
            className="!px-3 !py-2 text-xs"
          >
            Kategori
          </Button>
          <Button onClick={openAdd} className="!px-3 !py-2 text-xs">
            + Tambah
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex rounded-xl bg-white/5 p-1">
          {(['all', 'expense', 'income', 'transfer'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                filter === f ? 'bg-indigo-600 text-white' : 'text-white/50'
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSortAsc((v) => !v)}
          className="shrink-0 text-xs text-white/40 hover:text-white/70"
        >
          {sortAsc ? 'Terlama' : 'Terbaru'} ↕
        </button>
      </div>

      {isLoading && <LoadingBlock />}
      {isError && <ErrorBanner message="Gagal memuat transaksi. Coba sebentar lagi." />}

      {!isLoading && !isError && <TransactionList transactions={visible} onEdit={openEdit} />}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Ubah transaksi' : 'Tambah transaksi'}
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
