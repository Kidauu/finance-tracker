import { ArrowLeftRight, Banknote } from 'lucide-react'
import { formatIDR } from '../lib/format'
import { iconForAccount } from '../lib/categoryIcons'
import type { AccountBalance } from '../types'

interface AccountBalancesProps {
  balances: AccountBalance[]
  totalBalance: number
  onManage: () => void
  onTransfer: () => void
  onCashWithdrawal?: () => void
}

const TINTS = [
  { bg: 'bg-blue-soft', fg: 'text-blue' },
  { bg: 'bg-amber-soft', fg: 'text-amber' },
  { bg: 'bg-accent-soft2', fg: 'text-accent' },
  { bg: 'bg-expense-soft', fg: 'text-expense' },
]

export function AccountBalances({
  balances,
  totalBalance,
  onManage,
  onTransfer,
  onCashWithdrawal,
}: AccountBalancesProps) {
  if (balances.length === 0) return null

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-extrabold text-content">Rekening</h2>
        <div className="flex items-center gap-3.5">
          {onCashWithdrawal && (
            <button
              onClick={onCashWithdrawal}
              className="flex items-center gap-1.5 text-xs font-bold text-accent"
            >
              <Banknote size={13} strokeWidth={2.5} />
              Tarik tunai
            </button>
          )}
          {balances.length > 1 && (
            <button
              onClick={onTransfer}
              className="flex items-center gap-1.5 text-xs font-bold text-accent"
            >
              <ArrowLeftRight size={13} strokeWidth={2.5} />
              Transfer
            </button>
          )}
          <button onClick={onManage} className="text-xs font-bold text-muted">
            Atur
          </button>
        </div>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {balances.map((b, i) => {
          const Icon = iconForAccount(b.account.name)
          const tint = TINTS[i % TINTS.length]
          return (
            <div
              key={b.account.id}
              className="flex min-w-[104px] flex-1 flex-col gap-2 rounded-[18px] border border-line bg-surface p-3.5"
            >
              <span
                className={`flex h-[26px] w-[26px] items-center justify-center rounded-[9px] ${tint.bg} ${tint.fg}`}
              >
                <Icon size={14} />
              </span>
              <span className="truncate text-[11px] font-semibold text-muted">
                {b.account.name}
                {b.account.is_payroll && ' · gajian'}
              </span>
              <span
                className={`nums text-sm font-extrabold ${
                  b.balance < 0 ? 'text-expense' : 'text-content'
                }`}
              >
                {formatIDR(b.balance).replace(/^Rp\s?/, '')}
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex items-baseline justify-between px-1 pt-0.5">
        <span className="text-[11px] font-semibold text-muted">Total semua rekening</span>
        <span
          className={`nums text-[13px] font-extrabold ${
            totalBalance < 0 ? 'text-expense' : 'text-content'
          }`}
        >
          {formatIDR(totalBalance)}
        </span>
      </div>
    </section>
  )
}
