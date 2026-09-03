import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatIDR } from '../lib/format'
import { EmptyState } from './ui/Feedback'

export interface CategorySlice {
  name: string
  value: number
  color: string
}

export function CategoryChart({ data }: { data: CategorySlice[] }) {
  if (data.length === 0) {
    return <EmptyState title="Belum ada data" description="Catat transaksi dulu buat lihat grafiknya." />
  }

  return (
    <div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
            >
              {data.map((slice) => (
                <Cell key={slice.name} fill={slice.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatIDR(Number(value))}
              contentStyle={{
                background: '#17182a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                color: '#fff',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        {data.map((slice) => (
          <div key={slice.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-white/70">{slice.name}</span>
            </div>
            <span className="font-medium text-white/90">{formatIDR(slice.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
