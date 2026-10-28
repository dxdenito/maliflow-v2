import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )

  function toggle() {
    const next = !isDark
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('maliflow-theme', next ? 'dark' : 'light')
    } catch (error) {
      return
    } finally {
      setIsDark(next)
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="rounded-lg border border-line bg-surface p-2 text-muted transition hover:text-ink"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

export default ThemeToggle