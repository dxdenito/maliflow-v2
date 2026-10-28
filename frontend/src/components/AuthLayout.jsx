import Logo from './Logo'
import ThemeToggle from './ThemeToggle'

function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="safe-top safe-bottom relative flex min-h-dvh flex-col overflow-hidden bg-app px-5">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand/20 blur-3xl" />

      <header className="relative flex items-center justify-between py-5">
        <Logo size={36} />
        <ThemeToggle />
      </header>

      <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center pb-10">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-muted">{subtitle}</p>

        <div className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-xl shadow-black/5">
          {children}
        </div>

        <div className="mt-6 text-center text-sm text-muted">{footer}</div>
      </main>
    </div>
  )
}

export default AuthLayout