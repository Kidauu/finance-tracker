import { useState, type FormEvent } from 'react'
import { useAddCategory } from '../hooks/useCategories'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { SWATCHES } from '../lib/colorSwatches'

export function AddPotForm({ onDone }: { onDone: () => void }) {
  const addCategory = useAddCategory()
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
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal nambahin pot')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nama pot, mis. Nongkrong"
        autoFocus
      />
      <div className="flex gap-2">
        {SWATCHES.map((s) => (
          <button
            key={s}
            type="button"
            aria-label={`Pilih warna ${s}`}
            onClick={() => setColor(s)}
            className={`h-7 w-7 rounded-full ${color === s ? 'ring-2 ring-white' : ''}`}
            style={{ backgroundColor: s }}
          />
        ))}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
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
