import { useState } from 'react'
import { X } from 'lucide-react'
import type { TransactionWithCategory } from '../types'
import { formatDateShort, formatIDR, todayISO } from '../lib/format'
import { useDeleteTransaction } from '../hooks/useTransactions'
import { useToast } from '../hooks/useToast'
import { iconForCategory, TransferIcon } from '../lib/categoryIcons'
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

function yesterdayISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dateHeading(iso: string): string {
  if (iso === todayISO()) return 'Hari ini'
  if (iso === yesterdayISO()) return 'Kemarin'
  return formatDateShort(iso)
}

/** Rotates tint pairs by category colour family so rows read as a set. */
function tintFor(t: TransactionWithCategory) {
  if (t.type === 'transfer') return { bg: 'bg-accent-soft2', fg: 'text-accent' }
  if (t.type === 'income') return { bg: 'bg-accent-soft2', fg: 'text-accent' }
  const name = t.category?.name ?? ''
  if (/transport|bbm|motor|gojek/i.test(name)) return { bg: 'bg-amber-soft', fg: 'text-amber' }
  if (/tagihan|internet|listrik|kost|kos/i.test(name)) return { bg: 'bg-blue-soft', fg: 'text-blue' }
  return { bg: 'bg-expense-soft', fg: 'text-expense' }
}

export function TransactionList({ transactions, onEdit }: TransactionListProps) {
  const deleteTransaction = useDeleteTransaction()
  const { showToast } = useToast()
  const [pendingDelete, setPendingDelete] = useState<TransactionWithCategory | null>(null)

  if (transactions.length === 0) {
    return (
      <EmptyState
        title="Belum ada transaksi"
        description="Ketuk tombol + di bawah buat nyatet pemasukan atau pengeluaran pertama kamu."
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
      <div className="flex flex-col gap-4">
        {groupByDate(transactions).map(([date, items]) => {
          // transfers net to zero across your own accounts, so they're left out
          const dayTotal = items.reduce((sum, t) => {
            if (t.type === 'income') return sum + t.amount
            if (t.type === 'expense') return sum - t.amount
            return sum
          }, 0)

          return (
            <div key={date} className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-subtle">
                  {dateHeading(date)}
                </span>
                <span className="nums text-[11px] font-bold text-subtle">
                  {dayTotal >= 0 ? '+' : '−'}
                  {formatIDR(Math.abs(dayTotal))}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {items.map((t) => {
                  const Icon = t.type === 'transfer' ? TransferIcon : iconForCategory(t.category?.name)
                  const tint = tintFor(t)
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 rounded-[18px] border border-line bg-surface px-3.5 py-3"
                    >
                      <span
                        className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl ${tint.bg} ${tint.fg}`}
                      >
                        <Icon size={16} />
                      </span>

                      <button className="min-w-0 flex-1 text-left" onClick={() => onEdit(t)}>
                        <p className="truncate text-sm font-bold text-content">
                          {t.type === 'transfer'
                            ? `${t.account?.name ?? '?'} → ${t.to_account?.name ?? '?'}`
                            : (t.description || t.category?.name || 'Tanpa kategori')}
                        </p>
                        <p className="truncate text-[11px] text-subtle">
                          {t.type === 'transfer'
                            ? 'Transfer · antar rekening'
                            : [t.category?.name ?? 'Tanpa kategori', t.account?.name]
                                .filter(Boolean)
                                .join(' · ')}
                        </p>
                      </button>

                      <span
                        className={`nums shrink-0 text-sm font-extrabold ${
                          t.type === 'transfer' ? 'text-subtle' : 'text-content'
                        }`}
                      >
                        {t.type === 'income' ? '+' : t.type === 'expense' ? '−' : ''}
                        {formatIDR(t.amount).replace(/^Rp\s?/, '')}
                      </span>

                      <button
                        onClick={() => setPendingDelete(t)}
                        aria-label={`Hapus transaksi ${t.category?.name ?? ''}`}
                        className="-mr-1 shrink-0 rounded-lg p-1.5 text-faint hover:bg-expense-soft hover:text-expense"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )
                })}
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
            ? `${
                pendingDelete.type === 'transfer'
                  ? `Transfer ${pendingDelete.account?.name ?? '?'} → ${pendingDelete.to_account?.name ?? '?'}`
                  : (pendingDelete.category?.name ?? 'Tanpa kategori')
              } — ${formatIDR(pendingDelete.amount)} pada ${formatDateShort(pendingDelete.transaction_date)}. Tindakan ini gak bisa dibatalkan.`
            : ''
        }
        busy={deleteTransaction.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}
