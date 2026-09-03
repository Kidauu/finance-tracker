import type { NewCategory } from '../types'

export const DEFAULT_CATEGORIES: NewCategory[] = [
  // income — tetap vs tidak tetap
  { name: 'Gaji', type: 'income', color: '#34d399' },
  { name: 'Pendapatan Tidak Tetap', type: 'income', color: '#38bdf8' },
  { name: 'Freelance/Project', type: 'income', color: '#22d3ee' },
  { name: 'Bonus', type: 'income', color: '#a3e635' },
  { name: 'Lainnya', type: 'income', color: '#94a3b8' },

  // expense — pot harian
  { name: 'Uang Kost', type: 'expense', color: '#0ea5e9' },
  { name: 'Untuk Orang Tua', type: 'expense', color: '#f43f5e' },
  { name: 'Laundry', type: 'expense', color: '#06b6d4' },
  { name: 'BBM Motor', type: 'expense', color: '#eab308' },
  { name: 'Makanan & Minuman', type: 'expense', color: '#f97316' },
  { name: 'Kopi', type: 'expense', color: '#92400e' },
  { name: 'Vape', type: 'expense', color: '#78716c' },
  { name: 'Olahraga', type: 'expense', color: '#22c55e' },
  { name: 'Transportasi', type: 'expense', color: '#f59e0b' },
  { name: 'Tagihan', type: 'expense', color: '#ef4444' },
  { name: 'Belanja', type: 'expense', color: '#ec4899' },
  { name: 'Hiburan', type: 'expense', color: '#a855f7' },
  { name: 'Kesehatan', type: 'expense', color: '#14b8a6' },
  { name: 'Pendidikan', type: 'expense', color: '#6366f1' },
  { name: 'Lainnya', type: 'expense', color: '#64748b' },
]
