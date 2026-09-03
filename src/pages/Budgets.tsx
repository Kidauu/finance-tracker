import { useMemo, useState } from 'react'
import { useCategories, useDeleteCategory } from '../hooks/useCategories'
import { useBudgets, useSetBudget } from '../hooks/useBudgets'
import { useTransactions } from '../hooks/useTransactions'
import { BudgetCard } from '../components/BudgetCard'
import { AddPotForm } from '../components/AddPotForm'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { LoadingBlock, ErrorBanner } from '../components/ui/Feedback'
import { useToast } from '../hooks/useToast'
import { usePayPeriods } from '../hooks/usePayPeriods'
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

  const isLoading = categoriesLoading || txLoading
  const isError = categoriesError || txError

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Pot Anggaran</h2>
        {!addingPot && (
          <Button onClick={() => setAddingPot(true)} className="!px-3 !py-2 text-xs">
            + Pot baru
          </Button>
        )}
      </div>
      <p className="text-sm text-white/40">
        Set jatah per periode gaji — sisa & progress-nya update otomatis tiap kamu nambah
        transaksi. Jatah bisa diubah kapan aja, dan pot bisa dihapus kalau udah gak kepake.
      </p>

      {addingPot && <AddPotForm onDone={() => setAddingPot(false)} />}

      {isLoading && <LoadingBlock />}
      {isError && <ErrorBanner message="Gagal memuat pot anggaran. Coba sebentar lagi." />}

      {!isLoading && !isError && (
        <>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-white/50">Terpakai {cycle.label}</span>
              <span className="font-medium text-white">
                {formatIDR(totalSpent)} / {formatIDR(totalAllocated)}
              </span>
            </div>
            <p className="mt-1 text-xs text-white/30">
              {formatDateShort(cycle.start)} – {formatDateShort(cycle.end)}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {expenseCategories.map((c) => (
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

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Hapus pot ini?"
        message={
          pendingDelete
            ? `Pot "${pendingDelete.name}" dan jatah bulanannya akan dihapus. Transaksi lama yang pakai kategori ini tetap tersimpan, tapi jadi tanpa kategori.`
            : ''
        }
        busy={deleteCategory.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
