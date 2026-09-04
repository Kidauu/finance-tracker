import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { formatIDR } from '../lib/format'

interface SummaryCardsProps {
  totalIncome: number
  totalExpense: number
  /** period caption shown as a pill, e.g. "28 Agu – 27 Sep" */
  periodLabel?: string
  title?: string
}

/** Amount without the "Rp" prefix — the design renders that separately. */
function bareIDR(amount: number): string {
  return formatIDR(amount).replace(/^Rp\s?/, '')
}

export function SummaryCards({
  totalIncome,
  totalExpense,
  periodLabel,
  title = 'Saldo bersih',
}: SummaryCardsProps) {
  const net = totalIncome - totalExpense

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted">{title}</span>
        {periodLabel && (
          <span className="rounded-full bg-accent-soft px-2.5 py-1.5 text-[11px] font-bold text-accent">
            {periodLabel}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-[15px] font-bold text-muted">Rp</span>
        <span
          className={`nums text-[36px] font-extrabold leading-none ${
            net < 0 ? 'text-expense' : 'text-content'
          }`}
        >
          {bareIDR(net)}
        </span>
      </div>

      <div className="flex gap-2.5">
        <div className="flex flex-1 flex-col gap-1.5 rounded-2xl bg-accent-soft2 px-3.5 py-3">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-accent">
            <ArrowDownLeft size={13} strokeWidth={2.5} />
            Masuk
          </span>
          <span className="nums text-base font-extrabold text-content">
            {bareIDR(totalIncome)}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1.5 rounded-2xl bg-expense-soft px-3.5 py-3">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-expense">
            <ArrowUpRight size={13} strokeWidth={2.5} />
            Keluar
          </span>
          <span className="nums text-base font-extrabold text-content">
            {bareIDR(totalExpense)}
          </span>
        </div>
      </div>
    </section>
  )
}
