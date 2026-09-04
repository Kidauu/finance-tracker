import { formatIDR } from '../lib/format'
import type { AccountBalance } from '../types'

interface AccountBalancesProps {
  balances: AccountBalance[]
  totalBalance: number
  onManage: () => void
  onTransfer: () => void
}

export function AccountBalances({
  balances,
  totalBalance,
  onManage,
  onTransfer,
}: AccountBalancesProps) {
  if (balances.length === 0) return null

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/70">Rekening</h2>
        <div className="flex items-center gap-3">
          {balances.length > 1 && (
            <button onClick={onTransfer} className="text-xs text-indigo-400 hover:text-indigo-300">
              ⇄ Transfer
            </button>
          )}
          <button onClick={onManage} className="text-xs text-white/40 hover:text-white/70">
            Kelola
          </button>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-white/40">Total semua</p>
        <p
          className={`mt-0.5 text-2xl font-semibold tabular-nums ${
            totalBalance >= 0 ? 'text-white' : 'text-red-400'
          }`}
        >
          {formatIDR(totalBalance)}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {balances.map((b) => (
          <div
            key={b.account.id}
            className="flex items-center gap-3 rounded-xl bg-white/5 px-3.5 py-3"
          >
            <span
              className="h-8 w-1 shrink-0 rounded-full"
              style={{ backgroundColor: b.account.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {b.account.name}
                {b.account.is_payroll && (
                  <span className="ml-2 rounded-md bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
                    Payroll
                  </span>
                )}
              </p>
              <p className="text-xs text-white/40">
                {b.account.kind === 'savings' ? 'Simpanan / darurat' : 'Pengeluaran harian'}
              </p>
            </div>
            <span
              className={`shrink-0 text-sm font-semibold tabular-nums ${
                b.balance >= 0 ? 'text-white' : 'text-red-400'
              }`}
            >
              {formatIDR(b.balance)}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
