import { useState, type FormEvent } from 'react'
import { useAddCategory } from '../hooks/useCategories'
import { useToast } from '../hooks/useToast'
import { Button } from './ui/Button'
import { Input, Label } from './ui/Input'
import { SWATCHES } from '../lib/colorSwatches'
import { CategoryIcon } from '../lib/categoryIcons'

export function AddPotForm({ onDone }: { onDone: () => void }) {
  const addCategory = useAddCategory()
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [color, setColor] = useState(SWATCHES[0])
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Nama pot wajib diisi')
      return
    }
    try {
      await addCategory.mutateAsync({ name: name.trim(), type: 'expense', color })
      showToast(`Pot "${name.trim()}" ditambahkan`)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal nambahin pot')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-[22px] border border-line bg-surface p-4">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: color + '22', color }}
        >
          <CategoryIcon name={name} size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-content">
            {name.trim() || 'Nama pot'}
          </p>
          <p className="text-[11px] text-subtle">Ikonnya nyesuain nama otomatis</p>
        </div>
      </div>

      <div>
        <Label htmlFor="pot-name">Nama pot</Label>
        <Input
          id="pot-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="mis. Nongkrong"
          autoFocus
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

      <div className="flex gap-2.5">
        <Button type="button" variant="secondary" onClick={onDone} className="flex-1">
          Batal
        </Button>
        <Button type="submit" disabled={addCategory.isPending} className="flex-1">
          {addCategory.isPending ? 'Menambah…' : 'Tambah pot'}
        </Button>
      </div>
    </form>
  )
}
