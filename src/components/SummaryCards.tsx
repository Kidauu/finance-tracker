import { formatIDR } from '../lib/format'

interface SummaryCardsProps {
  totalIncome: number
  totalExpense: number
}

export function SummaryCards({ totalIncome, totalExpense }: SummaryCardsProps) {
  const net = totalIncome - totalExpense

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-white/40">Saldo bersih</p>
        <p
          className={`mt-1 text-2xl font-semibold ${
            net >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {formatIDR(net)}
        </p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-white/40">Pemasukan</p>
        <p className="mt-1 text-lg font-semibold text-emerald-400">{formatIDR(totalIncome)}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-white/40">Pengeluaran</p>
        <p className="mt-1 text-lg font-semibold text-red-400">{formatIDR(totalExpense)}</p>
      </div>
    </div>
  )
}
