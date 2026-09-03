import { useState, type FormEvent } from 'react'
import { useAddHoliday, useDeleteHoliday, useHolidays } from '../hooks/useHolidays'
import { Button } from './ui/Button'
import { Input, Label } from './ui/Input'
import { formatDateShort, todayISO } from '../lib/format'

export function HolidayManager() {
  const { data: holidays } = useHolidays()
  const addHoliday = useAddHoliday()
  const deleteHoliday = useDeleteHoliday()

  const [date, setDate] = useState(todayISO())
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await addHoliday.mutateAsync({ holiday_date: date, name: name || null })
      setName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tanggal ini mungkin sudah ada')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-white/50">
        Tanggal merah / libur di sini dipakai buat mundurin tanggal gajian kalau tanggal 28 jatuh
        di hari itu.
      </p>

      <form onSubmit={handleAdd} className="flex flex-col gap-3">
        <div>
          <Label htmlFor="holiday-date">Tanggal</Label>
          <Input
            id="holiday-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="holiday-name">Keterangan (opsional)</Label>
          <Input
            id="holiday-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Idul Fitri"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" disabled={addHoliday.isPending}>
          {addHoliday.isPending ? 'Menambah…' : 'Tambah hari libur'}
        </Button>
      </form>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/40">
          Daftar hari libur
        </p>
        <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
          {(holidays ?? []).length === 0 && (
            <p className="text-sm text-white/30">Belum ada hari libur ditambahkan.</p>
          )}
          {(holidays ?? []).map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
            >
              <div>
                <span className="text-sm text-white/80">{formatDateShort(h.holiday_date)}</span>
                {h.name && <span className="ml-2 text-xs text-white/40">{h.name}</span>}
              </div>
              <button
                onClick={() => deleteHoliday.mutate(h.id)}
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
