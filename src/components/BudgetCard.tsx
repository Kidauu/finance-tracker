import { useState } from 'react'
import { formatIDR, groupDigits } from '../lib/format'
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
  const [value, setValue] = useState(String(allocated || ''))

  const remaining = allocated - spent
  const pct = allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0
  const over = allocated > 0 && spent > allocated

  function handleSave() {
    const n = Number(value)
    onSave(Number.isFinite(n) && n >= 0 ? n : 0)
    setEditing(false)
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} />
          <span className="text-sm font-medium text-white">{category.name}</span>
        </div>
        {!editing && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setValue(String(allocated || ''))
                setEditing(true)
              }}
              className="text-xs text-white/40 hover:text-white/70"
            >
              {allocated > 0 ? 'Ubah pot' : 'Set pot'}
            </button>
            <button
              onClick={onDelete}
              disabled={deleting}
              aria-label={`Hapus pot ${category.name}`}
              className="text-xs text-white/30 hover:text-red-400 disabled:opacity-40"
            >
              🗑
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-white/40">
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
              className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 pl-9 pr-2.5 text-right text-sm font-semibold tabular-nums text-white outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
          >
            Simpan
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-lg px-2 py-1.5 text-xs text-white/40 hover:text-white/70"
          >
            ✕
          </button>
        </div>
      ) : (
        <>
          {allocated > 0 ? (
            <>
              <div className="mt-3 flex items-baseline justify-between text-sm">
                <span className="text-white/50">
                  {formatIDR(spent)} / {formatIDR(allocated)}
                </span>
                <span className={over ? 'text-red-400' : 'text-white/70'}>
                  {over ? `Lebih ${formatIDR(Math.abs(remaining))}` : `Sisa ${formatIDR(remaining)}`}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : 'bg-indigo-500'}`}
                  style={{ width: `${allocated > 0 ? (over ? 100 : pct) : 0}%` }}
                />
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-white/40">
              Belum ada pot. Terpakai {formatIDR(spent)} periode ini.
            </p>
          )}
        </>
      )}
    </div>
  )
}
