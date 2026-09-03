import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatIDR } from '../lib/format'
import { EmptyState } from './ui/Feedback'

export interface MonthlyPoint {
  month: string // e.g. "Jan 2026"
  income: number
  expense: number
}

export function MonthlyTrendChart({ data }: { data: MonthlyPoint[] }) {
  if (data.length === 0) {
    return <EmptyState title="Belum ada data" description="Catat transaksi dulu buat lihat grafiknya." />
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis
            dataKey="month"
            stroke="rgba(255,255,255,0.4)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="rgba(255,255,255,0.4)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => (v >= 1000000 ? `${v / 1000000}jt` : `${v / 1000}rb`)}
            width={40}
          />
          <Tooltip
            formatter={(value) => formatIDR(Number(value))}
            contentStyle={{
              background: '#17182a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              color: '#fff',
            }}
          />
          <Bar dataKey="income" name="Income" fill="#34d399" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" name="Expense" fill="#f87171" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
