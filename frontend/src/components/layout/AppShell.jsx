import { Outlet } from 'react-router-dom'
import Logo from '../Logo'
import NotificationBell from '../NotificationBell'
import ThemeToggle from '../ThemeToggle'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'

function AppShell() {
  return (
    <div className="flex min-h-dvh bg-app text-ink">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="safe-top sticky top-0 z-30 border-b border-line bg-app/80 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between px-5 py-3">
            <Logo size={32} />
            <div className="flex items-center gap-2">
              <NotificationBell />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 pt-6 pb-[calc(6rem_+_env(safe-area-inset-bottom))] lg:px-10 lg:pt-10 lg:pb-10">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  )
}

export default AppShell