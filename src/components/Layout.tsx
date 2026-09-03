import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const navItems = [
  { to: '/', label: 'Beranda', icon: '🏠' },
  { to: '/transactions', label: 'Transaksi', icon: '📋' },
  { to: '/budgets', label: 'Pot', icon: '👛' },
  { to: '/reports', label: 'Laporan', icon: '📊' },
]

export function Layout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth()

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-[#0f0f1a]">
      <header className="safe-top sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0f0f1a]/90 px-4 py-3 backdrop-blur">
        <h1 className="text-base font-semibold text-white">Finance Tracker</h1>
        <button onClick={() => signOut()} className="text-sm text-white/50 hover:text-white/80">
          Keluar
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">{children}</main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-lg items-stretch justify-around border-t border-white/10 bg-[#14152280]/95 backdrop-blur">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${
                isActive ? 'text-indigo-400' : 'text-white/40'
              }`
            }
          >
            <span className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
