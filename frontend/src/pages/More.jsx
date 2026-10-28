import { Link } from 'react-router-dom'
import { ChevronRight, LogOut } from 'lucide-react'
import { moreNav } from '../config/navigation'
import { useAuth } from '../context/AuthContext'

function More() {
  const { user, logout } = useAuth()
  const initial = user.full_name.trim().charAt(0).toUpperCase()

  return (
    <div>
      <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-dark text-lg font-bold text-brand">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{user.full_name}</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
        </div>
      </div>

      <h2 className="mt-8 mb-3 text-sm font-semibold tracking-wide text-muted uppercase">
        Manage
      </h2>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {moreNav.map((item, index) => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex items-center gap-4 px-4 py-4 transition active:bg-app ${
              index > 0 ? 'border-t border-line' : ''
            }`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <item.icon size={20} />
            </span>
            <span className="flex-1 font-medium">{item.label}</span>
            <ChevronRight size={18} className="text-muted" />
          </Link>
        ))}
      </div>

      <button
        onClick={logout}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface py-4 font-medium text-danger transition active:bg-app"
      >
        <LogOut size={18} /> Log out
      </button>
    </div>
  )
}

export default More