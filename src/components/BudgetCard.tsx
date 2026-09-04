import { useState } from 'react'
import { Check, Trash2, X } from 'lucide-react'
import { formatIDR, groupDigits } from '../lib/format'
import { CategoryIcon } from '../lib/categoryIcons'
import type { Category } from '../types'

interface BudgetCardProps {
  category: Category
  allocated: number
  spent: number
  onSave: (amount: number) => void
  onDelete: () => void
  saving: boolean
  deleting: boolean
}

export function BudgetCard({
  category,
  allocated,
  spent,
  onSave,
  onDelete,
  saving,
  deleting,
}: BudgetCardProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(Math.round(allocated) || ''))

  const remaining = allocated - spent
  const pct = allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0
  const over = allocated > 0 && spent > allocated

  function handleSave() {
    const n = Number(value)
    onSave(Number.isFinite(n) && n >= 0 ? n : 0)
    setEditing(false)
  }

  return (
    <div className="flex flex-col gap-3 rounded-[22px] border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px]"
          style={{ backgroundColor: category.color + '22', color: category.color }}
        >
          <CategoryIcon name={category.name} size={16} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-content">{category.name}</p>
          <p className="text-[11px] text-subtle">
            {allocated > 0 ? `terpakai ${pct}%` : `terpakai ${formatIDR(spent)}`}
          </p>
        </div>

        {!editing && (
          <>
            {allocated > 0 && (
              <span
                className="nums shrink-0 text-[13px] font-extrabold"
                style={{ color: over ? undefined : category.color }}
              >
                <span className={over ? 'text-expense' : undefined}>{pct}%</span>
              </span>
            )}
            <button
              onClick={() => {
                setValue(String(Math.round(allocated) || ''))
                setEditing(true)
              }}
              className="shrink-0 text-xs font-bold text-muted hover:text-content"
            >
              {allocated > 0 ? 'Ubah' : 'Set pot'}
            </button>
            <button
              onClick={onDelete}
              disabled={deleting}
              aria-label={`Hapus pot ${category.name}`}
              className="shrink-0 rounded-lg p-1 text-faint hover:text-expense disabled:opacity-40"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">
              Rp
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              value={groupDigits(value)}
              onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              className="nums h-11 w-full rounded-xl border border-line-input bg-bg py-0 pl-10 pr-3 text-right text-sm font-extrabold text-content outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            aria-label="Simpan pot"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-on-accent"
          >
            <Check size={16} strokeWidth={2.6} />
          </button>
          <button
            onClick={() => setEditing(false)}
            aria-label="Batal"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-alt text-muted"
          >
            <X size={16} />
          </button>
        </div>
      ) : allocated > 0 ? (
        <>
          <div className="h-2.5 overflow-hidden rounded-full bg-track">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${over ? 100 : pct}%`,
                backgroundColor: over ? 'var(--expense)' : category.color,
              }}
            />
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="nums font-bold text-content">
              {formatIDR(spent).replace(/^Rp\s?/, '')}
            </span>
            <span className={over ? 'font-bold text-expense' : 'text-subtle'}>
              {over
                ? `lebih ${formatIDR(Math.abs(remaining))}`
                : `sisa ${formatIDR(remaining)} dari ${formatIDR(allocated)}`}
            </span>
          </div>
        </>
      ) : (
        <p className="text-[11px] text-subtle">Belum ada jatah. Ketuk "Set pot" buat nentuin.</p>
      )}
    </div>
  )
}
