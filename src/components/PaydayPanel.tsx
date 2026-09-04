import { useState } from 'react'
import { CalendarDays, Check, ChevronRight, Plus } from 'lucide-react'
import { formatDateShort, formatIDR, todayISO } from '../lib/format'
import type { PaydayMonth } from '../hooks/usePaydayHistory'

interface PaydayPanelProps {
  months: PaydayMonth[]
  unrecordedPastCount: number
  onRecord: (month: PaydayMonth) => void
  onEdit: (month: PaydayMonth) => void
  onManageHolidays: () => void
}

function daysUntil(iso: string): number {
  const today = new Date(todayISO() + 'T00:00:00').getTime()
  const target = new Date(iso + 'T00:00:00').getTime()
  return Math.round((target - today) / 86_400_000)
}

/** "Gajian 21 hari lagi" / "Gajian hari ini" / "Periode berjalan" */
function headline(active: PaydayMonth | undefined, next: PaydayMonth | undefined): string {
  if (next && !next.isPast) {
    const d = daysUntil(next.payday)
    if (d === 0) return 'Gajian hari ini'
    if (d === 1) return 'Gajian besok'
    return `Gajian ${d} hari lagi`
  }
  if (active) return `Periode ${active.label}`
  return 'Gajian'
}

function MonthRow({
  month,
  onRecord,
  onEdit,
}: {
  month: PaydayMonth
  onRecord: (m: PaydayMonth) => void
  onEdit: (m: PaydayMonth) => void
}) {
  const recorded = month.loggedAmount !== null

  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-line bg-surface px-3.5 py-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] ${
          recorded ? 'bg-accent-soft2 text-accent' : 'bg-surface-alt text-faint'
        }`}
      >
        {recorded ? <Check size={16} strokeWidth={2.6} /> : <CalendarDays size={16} />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-content">
          {month.label}
          {month.isActiveCycle && (
            <span className="ml-2 rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold text-accent">
              Berjalan
            </span>
          )}
        </p>
        <p className="text-[11px] text-subtle">
          {formatDateShort(month.payday)} – {formatDateShort(month.periodEnd)}
        </p>
      </div>

      {recorded ? (
        <button onClick={() => onEdit(month)} className="shrink-0 text-right">
          <span className="nums block text-sm font-extrabold text-accent">
            {formatIDR(month.loggedAmount!)}
          </span>
          <span className="block text-[10px] text-faint">ketuk buat ubah</span>
        </button>
      ) : month.isPast ? (
        <button
          onClick={() => onRecord(month)}
          className="flex shrink-0 items-center gap-1 rounded-xl bg-accent px-3 py-2 text-xs font-bold text-on-accent"
        >
          <Plus size={13} strokeWidth={2.6} />
          Catat
        </button>
      ) : (
        <span className="shrink-0 text-[11px] text-faint">belum jatuh tempo</span>
      )}
    </div>
  )
}

export function PaydayPanel({
  months,
  unrecordedPastCount,
  onRecord,
  onEdit,
  onManageHolidays,
}: PaydayPanelProps) {
  const [open, setOpen] = useState(false)

  const active = months.find((m) => m.isActiveCycle)
  const next = months.find((m) => !m.isPast) ?? months[0]
  if (!active && !next) return null

  const reference = next && !next.isPast ? next : active
  const needsAttention = unrecordedPastCount > 0

  return (
    <section className="flex flex-col gap-2.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-[20px] border border-accent-line bg-accent-soft px-4 py-3.5 text-left"
      >
        <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl bg-accent text-on-accent">
          <CalendarDays size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-content">{headline(active, next)}</p>
          <p className="truncate text-[11px] text-label">
            {reference && formatDateShort(reference.payday)}
            {needsAttention && ` · ${unrecordedPastCount} belum dicatat`}
          </p>
        </div>
        <ChevronRight
          size={17}
          className={`shrink-0 text-accent transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-2">
          {months.slice(0, 6).map((m) => (
            <MonthRow key={m.monthStart} month={m} onRecord={onRecord} onEdit={onEdit} />
          ))}
          <button
            onClick={onManageHolidays}
            className="self-start px-1 py-1 text-xs font-bold text-muted"
          >
            Kelola hari libur
          </button>
        </div>
      )}
    </section>
  )
}
