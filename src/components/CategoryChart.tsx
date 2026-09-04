import { formatIDR } from '../lib/format'
import { EmptyState } from './ui/Feedback'

export interface CategorySlice {
  name: string
  value: number
  color: string
}

/**
 * The design replaces the pie with a single stacked bar plus a ranked list —
 * easier to read at phone width and it keeps the category colours legible.
 */
export function CategoryChart({ data }: { data: CategorySlice[] }) {
  if (data.length === 0) {
    return (
      <EmptyState title="Belum ada data" description="Catat transaksi dulu buat lihat rinciannya." />
    )
  }

  const total = data.reduce((sum, d) => sum + d.value, 0)
  const top = data.slice(0, 6)
  const restValue = data.slice(6).reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="flex flex-col gap-3.5 rounded-3xl border border-line bg-surface p-[18px]">
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
        {top.map((d) => (
          <div
            key={d.name}
            style={{
              width: total > 0 ? `${(d.value / total) * 100}%` : '0%',
              backgroundColor: d.color,
            }}
          />
        ))}
        {restValue > 0 && <div className="flex-1 bg-track" />}
      </div>

      <div className="flex flex-col gap-2.5">
        {top.map((d) => (
          <div key={d.name} className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: d.color }}
            />
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-content">
              {d.name}
            </span>
            <span className="nums shrink-0 text-[13px] font-extrabold text-content">
              {formatIDR(d.value).replace(/^Rp\s?/, '')}
            </span>
          </div>
        ))}
        {restValue > 0 && (
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px] bg-track" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-muted">
              Lainnya
            </span>
            <span className="nums shrink-0 text-[13px] font-extrabold text-muted">
              {formatIDR(restValue).replace(/^Rp\s?/, '')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
