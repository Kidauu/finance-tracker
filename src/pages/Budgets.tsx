import { useCallback, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useCategories, useDeleteCategory } from '../hooks/useCategories'
import { useBudgets, useSetBudget } from '../hooks/useBudgets'
import { useTransactions } from '../hooks/useTransactions'
import { usePayPeriods } from '../hooks/usePayPeriods'
import { useToast } from '../hooks/useToast'
import { useRegisterAddAction } from '../hooks/useAddAction'
import { BudgetCard } from '../components/BudgetCard'
import { AddPotForm } from '../components/AddPotForm'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { LoadingBlock, ErrorBanner } from '../components/ui/Feedback'
import { Modal } from '../components/ui/Modal'
import { formatDateShort, formatIDR } from '../lib/format'
import type { Category } from '../types'

export default function Budgets() {
  const { data: categories, isLoading: categoriesLoading, isError: categoriesError } =
    useCategories()
  const { data: budgets } = useBudgets()
  const { current: cycle } = usePayPeriods()
  const {
    data: transactions,
    isLoading: txLoading,
    isError: txError,
  } = useTransactions({ from: cycle.start, to: cycle.end })
  const setBudget = useSetBudget()
  const deleteCategory = useDeleteCategory()
  const { showToast } = useToast()

  const [addingPot, setAddingPot] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)

  const openAdd = useCallback(() => setAddingPot(true), [])
  useRegisterAddAction(openAdd)

  async function handleConfirmDelete() {
    if (!pendingDelete) return
    try {
      await deleteCategory.mutateAsync(pendingDelete.id)
      showToast(`Pot "${pendingDelete.name}" dihapus`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus pot', 'error')
    } finally {
      setPendingDelete(null)
    }
  }

  const expenseCategories = (categories ?? []).filter((c) => c.type === 'expense')

  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of transactions ?? []) {
      if (t.type !== 'expense' || !t.category_id) continue
      map.set(t.category_id, (map.get(t.category_id) ?? 0) + t.amount)
    }
    return map
  }, [transactions])

  const budgetByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of budgets ?? []) map.set(b.category_id, b.monthly_amount)
    return map
  }, [budgets])

  const totalAllocated = Array.from(budgetByCategory.values()).reduce((a, b) => a + b, 0)
  const totalSpent = Array.from(spentByCategory.values()).reduce((a, b) => a + b, 0)
  const pct = totalAllocated > 0 ? Math.min(100, Math.round((totalSpent / totalAllocated) * 100)) : 0

  // pots with a jatah first, then the untouched ones
  const sorted = useMemo(
    () =>
      [...expenseCategories].sort((a, b) => {
        const aHas = (budgetByCategory.get(a.id) ?? 0) > 0 ? 1 : 0
        const bHas = (budgetByCategory.get(b.id) ?? 0) > 0 ? 1 : 0
        if (aHas !== bHas) return bHas - aHas
        return a.name.localeCompare(b.name)
      }),
    [expenseCategories, budgetByCategory],
  )

  const isLoading = categoriesLoading || txLoading
  const isError = categoriesError || txError

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-extrabold tracking-tight text-content">Pot</h1>
          <p className="text-[13px] text-muted">Sisihkan dulu, baru dipakai.</p>
        </div>
        <button
          onClick={() => setAddingPot(true)}
          aria-label="Pot baru"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[13px] border border-line-input bg-surface text-label"
        >
          <Plus size={17} />
        </button>
      </header>

      {isLoading && <LoadingBlock />}
      {isError && <ErrorBanner message="Gagal memuat pot anggaran. Coba sebentar lagi." />}

      {!isLoading && !isError && (
        <>
          <section className="flex flex-col gap-2.5 rounded-[22px] border border-accent-line bg-accent-soft p-[18px]">
            <span className="text-xs font-bold text-label">Terpakai {cycle.label}</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-label">Rp</span>
              <span className="nums text-[28px] font-extrabold leading-none text-content">
                {formatIDR(totalSpent).replace(/^Rp\s?/, '')}
              </span>
            </div>
            {totalAllocated > 0 && (
              <div className="h-2.5 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
            <span className="text-xs text-label">
              {totalAllocated > 0
                ? `dari jatah ${formatIDR(totalAllocated)} · ${pct}% jalan`
                : 'belum ada jatah yang diset'}
            </span>
            <span className="text-[11px] text-label/70">
              {formatDateShort(cycle.start)} – {formatDateShort(cycle.end)}
            </span>
          </section>

          <div className="flex flex-col gap-2.5">
            {sorted.map((c) => (
              <BudgetCard
                key={c.id}
                category={c}
                allocated={budgetByCategory.get(c.id) ?? 0}
                spent={spentByCategory.get(c.id) ?? 0}
                saving={setBudget.isPending}
                deleting={deleteCategory.isPending && deleteCategory.variables === c.id}
                onSave={(amount) => setBudget.mutate({ categoryId: c.id, monthlyAmount: amount })}
                onDelete={() => setPendingDelete(c)}
              />
            ))}
          </div>
        </>
      )}

      <Modal open={addingPot} onClose={() => setAddingPot(false)} title="Pot baru">
        <AddPotForm onDone={() => setAddingPot(false)} />
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Hapus pot ini?"
        message={
          pendingDelete
            ? `Pot "${pendingDelete.name}" dan jatahnya akan dihapus. Transaksi lama yang pakai kategori ini tetap tersimpan, tapi jadi tanpa kategori.`
            : ''
        }
        busy={deleteCategory.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
