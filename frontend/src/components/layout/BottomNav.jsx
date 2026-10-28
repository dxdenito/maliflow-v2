import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LayoutGrid, Plus } from 'lucide-react'
import { mobileLeft, mobileRight, moreNav } from '../../config/navigation'

const baseTab =
  'flex flex-col items-center gap-1 py-1 text-[11px] font-medium transition active:scale-95'

function Tab({ item }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `${baseTab} ${isActive ? 'text-brand' : 'text-muted'}`
      }
    >
      <item.icon size={22} />
      {item.label}
    </NavLink>
  )
}

function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const moreActive =
    pathname === '/more' || moreNav.some((item) => pathname.startsWith(item.to))

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5 items-end px-2 pt-2 pb-2">
        {mobileLeft.map((item) => (
          <Tab key={item.to} item={item} />
        ))}

        <div className="flex justify-center">
          <button
            onClick={() => navigate('/expenses?add=1')}
            aria-label="Add expense"
            className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-on-brand shadow-lg shadow-brand/40 ring-4 ring-surface transition active:scale-95"
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        </div>

        {mobileRight.map((item) => (
          <Tab key={item.to} item={item} />
        ))}

        <Link
          to="/more"
          className={`${baseTab} ${moreActive ? 'text-brand' : 'text-muted'}`}
        >
          <LayoutGrid size={22} />
          More
        </Link>
      </div>
    </nav>
  )
}

export default BottomNav