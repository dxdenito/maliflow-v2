import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMonth } from '../lib/format'

const buttonClass =
  'flex h-10 w-10 items-center justify-center rounded-xl text-muted transition hover:text-ink active:scale-95'

function MonthSwitcher({ month, onPrevious, onNext }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line bg-surface p-1.5">
      <button
        onClick={onPrevious}
        aria-label="Previous month"
        className={buttonClass}
      >
        <ChevronLeft size={20} />
      </button>
      <span className="font-semibold">{formatMonth(month)}</span>
      <button onClick={onNext} aria-label="Next month" className={buttonClass}>
        <ChevronRight size={20} />
      </button>
    </div>
  )
}

export default MonthSwitcher