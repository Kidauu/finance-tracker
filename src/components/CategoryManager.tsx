import { useState, type FormEvent } from 'react'
import { useAddCategory, useCategories, useDeleteCategory } from '../hooks/useCategories'
import { Button } from './ui/Button'
import { Input, Label } from './ui/Input'
import { SWATCHES } from '../lib/colorSwatches'
import type { CategoryType } from '../types'

export function CategoryManager() {
  const { data: categories } = useCategories()
  const addCategory = useAddCategory()
  const deleteCategory = useDeleteCategory()

  const [name, setName] = useState('')
  const [type, setType] = useState<CategoryType>('expense')
  const [color, setColor] = useState(SWATCHES[0])
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Nama wajib diisi')
      return
    }
    try {
      await addCategory.mutateAsync({ name: name.trim(), type, color })
      setName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah kategori')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={handleAdd} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-xl py-2 text-sm font-medium ${
                type === t ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/50'
              }`}
            >
              {t === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
            </button>
          ))}
        </div>
        <div>
          <Label htmlFor="cat-name">Nama</Label>
          <Input
            id="cat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="mis. Langganan"
          />
        </div>
        <div>
          <Label>Warna</Label>
          <div className="flex gap-2">
            {SWATCHES.map((s) => (
              <button
                key={s}
                type="button"
                aria-label={`Choose ${s}`}
                onClick={() => setColor(s)}
                className={`h-7 w-7 rounded-full ${color === s ? 'ring-2 ring-white' : ''}`}
                style={{ backgroundColor: s }}
              />
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" disabled={addCategory.isPending}>
          {addCategory.isPending ? 'Menambah…' : 'Tambah kategori'}
        </Button>
      </form>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/40">
          Kategori kamu
        </p>
        <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
          {(categories ?? []).map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="text-sm text-white/80">{c.name}</span>
                <span className="text-xs text-white/30">
                  ({c.type === 'expense' ? 'pengeluaran' : 'pemasukan'})
                </span>
              </div>
              <button
                onClick={() => deleteCategory.mutate(c.id)}
                className="text-xs text-white/30 hover:text-red-400"
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
