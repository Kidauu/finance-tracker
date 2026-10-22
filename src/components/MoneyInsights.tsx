import { Lightbulb, TrendingUp, TriangleAlert, WalletCards } from 'lucide-react'
import type { MoneyInsight } from '../lib/moneyInsights'

const STYLES = {
  warning: { icon: TriangleAlert, surface: 'bg-expense-soft text-expense' },
  pace: { icon: WalletCards, surface: 'bg-amber-soft text-amber' },
  trend: { icon: TrendingUp, surface: 'bg-blue-soft text-blue' },
} as const

export function MoneyInsights({ insights }: { insights: MoneyInsight[] }) {
  if (insights.length === 0) return null

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5">
        <Lightbulb size={14} className="text-amber" />
        <h2 className="text-[13px] font-extrabold text-content">Yang perlu diperhatikan</h2>
      </div>
      <div className="flex flex-col gap-2">
        {insights.map((insight) => {
          const { icon: Icon, surface } = STYLES[insight.tone]
          return (
            <div
              key={`${insight.tone}-${insight.title}`}
              className="flex items-start gap-3 rounded-[18px] border border-line bg-surface px-3.5 py-3"
            >
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${surface}`}>
                <Icon size={15} />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-extrabold text-content">{insight.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{insight.detail}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
