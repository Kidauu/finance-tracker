import { useState, type FormEvent } from 'react'
import { CalendarOff, Trash2 } from 'lucide-react'
import { useAddHoliday, useDeleteHoliday, useHolidays } from '../hooks/useHolidays'
import { useToast } from '../hooks/useToast'
import { Button } from './ui/Button'
import { Input, Label } from './ui/Input'
import { formatDateShort, todayISO } from '../lib/format'

export function HolidayManager() {
  const { data: holidays } = useHolidays()
  const addHoliday = useAddHoliday()
  const deleteHoliday = useDeleteHoliday()
  const { showToast } = useToast()

  const [date, setDate] = useState(todayISO())
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await addHoliday.mutateAsync({ holiday_date: date, name: name || null })
      showToast('Hari libur ditambahkan')
      setName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tanggal ini mungkin sudah ada')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="rounded-2xl bg-accent-soft px-4 py-3 text-[13px] leading-relaxed text-label">
        Tanggal merah di sini dipakai buat mundurin tanggal gajian kalau tanggal 28 jatuh di hari
        itu.
      </p>

      <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
        {(holidays ?? []).length === 0 && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-dashed border-line-strong px-4 py-4 text-[13px] text-muted">
            <CalendarOff size={16} className="shrink-0 text-faint" />
            Belum ada hari libur ditambahkan.
          </div>
        )}
        {(holidays ?? []).map((h) => (
          <div
            key={h.id}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-content">
                {formatDateShort(h.holiday_date)}
              </p>
              {h.name && <p className="truncate text-[11px] text-subtle">{h.name}</p>}
            </div>
            <button
              onClick={() => deleteHoliday.mutate(h.id)}
              aria-label={`Hapus ${h.holiday_date}`}
              className="shrink-0 rounded-lg p-1 text-faint hover:text-expense"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="flex flex-col gap-3.5 border-t border-line pt-5">
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
            placeholder="mis. Idul Fitri"
          />
        </div>
        {error && <p className="text-[13px] font-medium text-expense">{error}</p>}
        <Button type="submit" disabled={addHoliday.isPending}>
          {addHoliday.isPending ? 'Menambah…' : 'Tambah hari libur'}
        </Button>
      </form>
    </div>
  )
}
