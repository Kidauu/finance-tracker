import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { useAddCategory, useCategories, useDeleteCategory } from '../hooks/useCategories'
import { useToast } from '../hooks/useToast'
import { Button } from './ui/Button'
import { Input, Label } from './ui/Input'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { SWATCHES } from '../lib/colorSwatches'
import { iconForCategory } from '../lib/categoryIcons'
import type { Category, CategoryType } from '../types'

export function CategoryManager() {
  const { data: categories } = useCategories()
  const addCategory = useAddCategory()
  const deleteCategory = useDeleteCategory()
  const { showToast } = useToast()

  const [name, setName] = useState('')
  const [type, setType] = useState<CategoryType>('expense')
  const [color, setColor] = useState(SWATCHES[0])
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)

  const listed = (categories ?? []).filter((c) => c.type === type)

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Nama wajib diisi')
      return
    }
    try {
      await addCategory.mutateAsync({ name: name.trim(), type, color })
      showToast('Kategori ditambahkan')
      setName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah kategori')
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return
    try {
      await deleteCategory.mutateAsync(pendingDelete.id)
      showToast(`Kategori "${pendingDelete.name}" dihapus`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus', 'error')
    } finally {
      setPendingDelete(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1.5 rounded-2xl bg-surface-alt p-1.5">
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-colors ${
              type === t ? 'bg-surface text-content shadow-sm' : 'text-muted'
            }`}
          >
            {t === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
          </button>
        ))}
      </div>

      <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
        {listed.map((c) => {
          const Icon = iconForCategory(c.name)
          return (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-2.5"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: c.color + '22', color: c.color }}
              >
                <Icon size={15} />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-content">
                {c.name}
              </span>
              <button
                onClick={() => setPendingDelete(c)}
                aria-label={`Hapus ${c.name}`}
                className="shrink-0 rounded-lg p-1 text-faint hover:text-expense"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}
      </div>

      <form onSubmit={handleAdd} className="flex flex-col gap-3.5 border-t border-line pt-5">
        <div>
          <Label htmlFor="cat-name">Kategori baru</Label>
          <Input
            id="cat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="mis. Langganan"
          />
        </div>
        <div>
          <Label>Warna</Label>
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((s) => (
              <button
                key={s}
                type="button"
                aria-label={`Pilih warna ${s}`}
                onClick={() => setColor(s)}
                className={`h-8 w-8 rounded-full transition-transform ${
                  color === s ? 'scale-110 ring-2 ring-content ring-offset-2 ring-offset-bg' : ''
                }`}
                style={{ backgroundColor: s }}
              />
            ))}
          </div>
        </div>
        {error && <p className="text-[13px] font-medium text-expense">{error}</p>}
        <Button type="submit" disabled={addCategory.isPending}>
          {addCategory.isPending ? 'Menambah…' : 'Tambah kategori'}
        </Button>
      </form>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Hapus kategori?"
        message={
          pendingDelete
            ? `"${pendingDelete.name}" akan dihapus. Transaksi lama tetap tersimpan tapi jadi tanpa kategori.`
            : ''
        }
        busy={deleteCategory.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
