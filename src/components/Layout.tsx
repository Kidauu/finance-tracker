import { BarChart3, House, List, PiggyBank, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Beranda', icon: House },
  { to: '/transactions', label: 'Transaksi', icon: List },
  { to: '/budgets', label: 'Pot', icon: PiggyBank },
  { to: '/reports', label: 'Laporan', icon: BarChart3 },
]

interface LayoutProps {
  children: ReactNode
  /** the nav's centre action — the design puts "add" here rather than in a header */
  onAdd?: () => void
}

export function Layout({ children, onAdd }: LayoutProps) {
  const [left, right] = [navItems.slice(0, 2), navItems.slice(2)]

  function renderItem({ to, label, icon: Icon }: (typeof navItems)[number]) {
    return (
      <NavLink
        key={to}
        to={to}
        end={to === '/'}
        className={({ isActive }) =>
          `flex flex-1 flex-col items-center gap-1 py-1 ${
            isActive ? 'text-accent' : 'text-faint'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
            <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-semibold'}`}>
              {label}
            </span>
          </>
        )}
      </NavLink>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-bg">
      <main className="safe-top flex-1 px-5 pb-32 pt-4">{children}</main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-lg items-end gap-1 border-t border-line bg-bg/95 px-4 pb-5 pt-2.5 backdrop-blur">
        {left.map(renderItem)}
        <div className="flex flex-1 justify-center">
          <button
            onClick={onAdd}
            aria-label="Tambah transaksi"
            disabled={!onAdd}
            className="mb-0.5 flex h-[50px] w-[50px] items-center justify-center rounded-[18px] bg-ink text-on-ink transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-40"
          >
            <Plus size={22} strokeWidth={2.4} />
          </button>
        </div>
        {right.map(renderItem)}
      </nav>
    </div>
  )
}
