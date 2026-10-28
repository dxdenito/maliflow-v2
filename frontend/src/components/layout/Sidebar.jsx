import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import Logo from '../Logo'
import NotificationBell from '../NotificationBell'
import ThemeToggle from '../ThemeToggle'
import { useAuth } from '../../context/AuthContext'
import { mainNav } from '../../config/navigation'

function Sidebar() {
  const { user, logout } = useAuth()
  const initial = user.full_name.trim().charAt(0).toUpperCase()

  return (
    <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
      <div className="flex items-center justify-between px-2">
        <Logo size={34} />
        <div className="flex items-center gap-2">
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1 overflow-y-auto">
        {mainNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-brand/10 text-brand'
                  : 'text-muted hover:bg-app hover:text-ink'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 flex items-center gap-3 rounded-xl border border-line p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-dark text-sm font-bold text-brand">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user.full_name}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
        <button
          onClick={logout}
          aria-label="Log out"
          className="text-muted transition hover:text-danger"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  )
}

export default Sidebar