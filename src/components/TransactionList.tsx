import { useState } from 'react'
import type { TransactionWithCategory } from '../types'
import { formatDateShort, formatIDR, todayISO } from '../lib/format'
import { useDeleteTransaction } from '../hooks/useTransactions'
import { useToast } from '../hooks/useToast'
import { EmptyState } from './ui/Feedback'
import { ConfirmDialog } from './ui/ConfirmDialog'

interface TransactionListProps {
  transactions: TransactionWithCategory[]
  onEdit: (transaction: TransactionWithCategory) => void
}

function groupByDate(transactions: TransactionWithCategory[]) {
  const groups = new Map<string, TransactionWithCategory[]>()
  for (const t of transactions) {
    const list = groups.get(t.transaction_date) ?? []
    list.push(t)
    groups.set(t.transaction_date, list)
  }
  return Array.from(groups.entries())
}

function dateHeading(iso: string): string {
  const today = todayISO()
  if (iso === today) return `Hari ini · ${formatDateShort(iso)}`
  const y = new Date()
  y.setDate(y.getDate() - 1)
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`
  if (iso === yesterday) return `Kemarin · ${formatDateShort(iso)}`
  return formatDateShort(iso)
}

export function TransactionList({ transactions, onEdit }: TransactionListProps) {
  const deleteTransaction = useDeleteTransaction()
  const { showToast } = useToast()
  const [pendingDelete, setPendingDelete] = useState<TransactionWithCategory | null>(null)

  if (transactions.length === 0) {
    return (
      <EmptyState
        title="Belum ada transaksi"
        description="Ketuk tombol + Tambah buat nyatet pemasukan atau pengeluaran pertama kamu."
      />
    )
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return
    try {
      await deleteTransaction.mutateAsync(pendingDelete.id)
      showToast('Transaksi dihapus')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus', 'error')
    } finally {
      setPendingDelete(null)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {groupByDate(transactions).map(([date, items]) => {
          const dayTotal = items.reduce(
            (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount),
            0,
          )
          return (
            <div key={date}>
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-white/40">
                  {dateHeading(date)}
                </p>
                <p
                  className={`text-xs font-medium tabular-nums ${
                    dayTotal >= 0 ? 'text-emerald-400/70' : 'text-white/40'
                  }`}
                >
                  {dayTotal >= 0 ? '+' : '−'}
                  {formatIDR(Math.abs(dayTotal))}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-3"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm"
                      style={{ backgroundColor: (t.category?.color ?? '#6366f1') + '33' }}
                    >
                      {t.type === 'income' ? '↑' : '↓'}
                    </span>
                    <button className="min-w-0 flex-1 text-left" onClick={() => onEdit(t)}>
                      <p className="truncate text-sm font-medium text-white">
                        {t.category?.name ?? 'Tanpa kategori'}
                      </p>
                      {t.description && (
                        <p className="truncate text-xs text-white/40">{t.description}</p>
                      )}
                    </button>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          t.type === 'income' ? 'text-emerald-400' : 'text-white/80'
                        }`}
                      >
                        {t.type === 'income' ? '+' : '−'}
                        {formatIDR(t.amount)}
                      </span>
                      <button
                        onClick={() => setPendingDelete(t)}
                        aria-label={`Hapus transaksi ${t.category?.name ?? ''}`}
                        className="rounded-lg p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Hapus transaksi?"
        message={
          pendingDelete
            ? `${pendingDelete.category?.name ?? 'Tanpa kategori'} — ${formatIDR(pendingDelete.amount)} pada ${formatDateShort(pendingDelete.transaction_date)}. Tindakan ini gak bisa dibatalkan.`
            : ''
        }
        busy={deleteTransaction.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}
