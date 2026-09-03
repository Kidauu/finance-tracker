import { useState } from 'react'
import { formatDateShort, formatIDR } from '../lib/format'
import type { PaydayMonth } from '../hooks/usePaydayHistory'

interface PaydayPanelProps {
  months: PaydayMonth[]
  unrecordedPastCount: number
  onRecord: (month: PaydayMonth) => void
  onEdit: (month: PaydayMonth) => void
  onManageHolidays: () => void
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
    <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3.5 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">
          {month.label}
          {month.isCurrentMonth && (
            <span className="ml-2 rounded-md bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300">
              Bulan ini
            </span>
          )}
          {!month.isCurrentMonth && month.isActiveCycle && (
            <span className="ml-2 rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
              Periode berjalan
            </span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-white/40">
          Gajian {formatDateShort(month.payday)}
        </p>
        <p className="text-[11px] text-white/25">
          Nutupin {formatDateShort(month.payday)} – {formatDateShort(month.periodEnd)}
        </p>
      </div>

      {recorded ? (
        <button
          onClick={() => onEdit(month)}
          className="shrink-0 text-right"
          aria-label={`Ubah gaji ${month.label}`}
        >
          <span className="block text-sm font-semibold text-emerald-400">
            {formatIDR(month.loggedAmount!)}
          </span>
          <span className="block text-[11px] text-white/30">Ketuk buat ubah</span>
        </button>
      ) : month.isPast ? (
        <button
          onClick={() => onRecord(month)}
          className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 active:bg-indigo-700"
        >
          + Catat
        </button>
      ) : (
        <span className="shrink-0 text-xs text-white/30">Belum jatuh tempo</span>
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
  const [expanded, setExpanded] = useState(false)

  const current = months[0]
  const rest = months.slice(1)
  const visible = expanded ? rest : rest.slice(0, 2)

  if (!current) return null

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-white/70">Gajian</h2>
          {unrecordedPastCount > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-300">
              {unrecordedPastCount} belum dicatat
            </span>
          )}
        </div>
        <button onClick={onManageHolidays} className="text-xs text-white/40 hover:text-white/70">
          Kelola libur
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <MonthRow month={current} onRecord={onRecord} onEdit={onEdit} />
        {visible.map((m) => (
          <MonthRow key={m.monthStart} month={m} onRecord={onRecord} onEdit={onEdit} />
        ))}
      </div>

      {rest.length > 2 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 w-full rounded-lg py-2 text-xs font-medium text-indigo-400 hover:bg-white/5 hover:text-indigo-300"
        >
          {expanded ? 'Tampilkan lebih sedikit' : `Lihat ${rest.length - 2} bulan sebelumnya`}
        </button>
      )}
    </section>
  )
}
