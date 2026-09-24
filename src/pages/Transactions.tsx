import { useCallback, useMemo, useState } from 'react'
import { ArrowDownUp, ListFilter, Search, Tags, X } from 'lucide-react'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { useAccounts } from '../hooks/useAccounts'
import { useRegisterAddAction } from '../hooks/useAddAction'
import { TransactionList } from '../components/TransactionList'
import { TransactionForm } from '../components/TransactionForm'
import { CategoryManager } from '../components/CategoryManager'
import { TransactionFilterPanel } from '../components/TransactionFilterPanel'
import { Modal } from '../components/ui/Modal'
import { IconInput } from '../components/ui/Input'
import { LoadingBlock, ErrorBanner } from '../components/ui/Feedback'
import { formatIDR } from '../lib/format'
import { CategoryIcon, AccountIcon } from '../lib/categoryIcons'
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
  const { data: categories } = useCategories()
  const { data: accounts } = useAccounts()

  const [sortAsc, setSortAsc] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set())
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set())
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [editing, setEditing] = useState<TransactionWithCategory | undefined>(undefined)

  // categories offered in the filter panel are narrowed to whatever the type
  // pill already selected — a category picked for "Keluar" makes no sense once
  // you're looking at "Masuk", so switching type also clears the category pick
  const categoriesForFilter = useMemo(() => {
    const list = categories ?? []
    if (filter === 'expense') return list.filter((c) => c.type === 'expense')
    if (filter === 'income') return list.filter((c) => c.type === 'income')
    if (filter === 'transfer') return []
    return list
  }, [categories, filter])

  function changeTypeFilter(next: Filter) {
    setFilter(next)
    setSelectedCategoryIds(new Set())
  }

  function toggleCategory(id: string) {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAccount(id: string) {
    setSelectedAccountIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function resetFilters() {
    setSelectedCategoryIds(new Set())
    setSelectedAccountIds(new Set())
  }

  const activeFilterCount = selectedCategoryIds.size + selectedAccountIds.size

  const visible = useMemo(() => {
    let list = transactions ?? []
    if (filter !== 'all') list = list.filter((t) => t.type === filter)

    if (selectedCategoryIds.size > 0) {
      list = list.filter((t) => t.category_id !== null && selectedCategoryIds.has(t.category_id))
    }

    if (selectedAccountIds.size > 0) {
      list = list.filter(
        (t) =>
          (t.account_id !== null && selectedAccountIds.has(t.account_id)) ||
          (t.to_account_id !== null && selectedAccountIds.has(t.to_account_id)),
      )
    }

    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((t) =>
        [t.description, t.category?.name, t.account?.name, t.to_account?.name]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(q)),
      )
    }
    return sortAsc ? [...list].reverse() : list
  }, [transactions, sortAsc, filter, query, selectedCategoryIds, selectedAccountIds])

  const spentThisList = useMemo(
    () => visible.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [visible],
  )

  const selectedCategories = useMemo(
    () => (categories ?? []).filter((c) => selectedCategoryIds.has(c.id)),
    [categories, selectedCategoryIds],
  )
  const selectedAccounts = useMemo(
    () => (accounts ?? []).filter((a) => selectedAccountIds.has(a.id)),
    [accounts, selectedAccountIds],
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
            onClick={() => changeTypeFilter(f)}
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
          onClick={() => setFiltersOpen(true)}
          className={`relative flex shrink-0 items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
            activeFilterCount > 0
              ? 'border border-accent-line bg-accent-soft text-accent'
              : 'border border-line-input bg-surface text-label'
          }`}
        >
          <ListFilter size={13} />
          Filter
          {activeFilterCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-on-accent">
              {activeFilterCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setSortAsc((v) => !v)}
          aria-label="Ubah urutan"
          className="ml-auto flex shrink-0 items-center gap-1 rounded-full border border-line-input bg-surface px-3 py-2 text-xs font-semibold text-label"
        >
          <ArrowDownUp size={13} />
          {sortAsc ? 'Terlama' : 'Terbaru'}
        </button>
      </div>

      {(selectedCategories.length > 0 || selectedAccounts.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {selectedCategories.map((c) => (
            <button
              key={c.id}
              onClick={() => toggleCategory(c.id)}
              className="flex items-center gap-1.5 rounded-full bg-surface-alt py-1.5 pl-2.5 pr-2 text-[11px] font-bold text-content"
            >
              <CategoryIcon name={c.name} size={12} />
              {c.name}
              <X size={11} className="text-faint" />
            </button>
          ))}
          {selectedAccounts.map((a) => (
            <button
              key={a.id}
              onClick={() => toggleAccount(a.id)}
              className="flex items-center gap-1.5 rounded-full bg-surface-alt py-1.5 pl-2.5 pr-2 text-[11px] font-bold text-content"
            >
              <AccountIcon name={a.name} size={12} />
              {a.name}
              <X size={11} className="text-faint" />
            </button>
          ))}
          <button
            onClick={resetFilters}
            className="text-[11px] font-bold text-muted underline-offset-2 hover:underline"
          >
            Hapus semua
          </button>
        </div>
      )}

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

      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filter transaksi">
        <TransactionFilterPanel
          categories={categoriesForFilter}
          groupByType={filter === 'all'}
          accounts={accounts ?? []}
          selectedCategoryIds={selectedCategoryIds}
          selectedAccountIds={selectedAccountIds}
          onToggleCategory={toggleCategory}
          onToggleAccount={toggleAccount}
          onReset={resetFilters}
          onClose={() => setFiltersOpen(false)}
        />
      </Modal>
    </div>
  )
}
