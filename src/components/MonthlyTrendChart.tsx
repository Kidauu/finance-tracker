import { formatIDR } from '../lib/format'
import { EmptyState } from './ui/Feedback'

export interface MonthlyPoint {
  month: string
  income: number
  expense: number
}

const BAR_AREA = 110

/**
 * Paired income/expense bars, drawn directly rather than via a chart library —
 * the design's proportions (11px bars, 6px radius) are easier to hit exactly,
 * and it drops a 320KB dependency from the reports bundle.
 */
export function MonthlyTrendChart({ data }: { data: MonthlyPoint[] }) {
  if (data.length === 0) {
    return (
      <EmptyState title="Belum ada data" description="Catat transaksi dulu buat lihat grafiknya." />
    )
  }

  const max = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1)
  const latest = data.length - 1

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-[18px]">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-extrabold text-content">Masuk vs keluar</span>
        <div className="flex gap-2.5 text-[10px] font-bold text-muted">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-[3px] bg-accent" />
            Masuk
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-[3px] bg-expense" />
            Keluar
          </span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-1 overflow-x-auto">
        {data.map((d, i) => (
          <div key={`${d.month}-${i}`} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex items-end gap-1" style={{ height: BAR_AREA }}>
              <div
                className="w-[11px] rounded-md bg-accent"
                style={{ height: Math.max(3, (d.income / max) * BAR_AREA) }}
                title={`Masuk ${formatIDR(d.income)}`}
              />
              <div
                className={`w-[11px] rounded-md ${i === latest ? 'bg-expense' : 'bg-expense/45'}`}
                style={{ height: Math.max(3, (d.expense / max) * BAR_AREA) }}
                title={`Keluar ${formatIDR(d.expense)}`}
              />
            </div>
            <span
              className={`truncate text-[10px] ${
                i === latest ? 'font-extrabold text-content' : 'font-semibold text-subtle'
              }`}
            >
              {d.month}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
