import { useCallback, useEffect, useState } from 'react'
import { Copy, Loader2, Pencil, Plus, Settings2, Target } from 'lucide-react'
import BudgetModal from '../components/BudgetModal'
import CategoriesModal from '../components/CategoriesModal'
import MonthSwitcher from '../components/MonthSwitcher'
import { getCategoryIcon } from '../config/categoryIcons'
import { getErrorMessage } from '../lib/api'
import { fetchBudget } from '../lib/budgets'
import { fetchCategories } from '../lib/categories'
import {
  currentMonth,
  formatMoney,
  formatMonth,
  shiftMonth,
} from '../lib/format'

function barColor(ratio) {
  if (ratio > 1) return 'bg-danger'
  if (ratio >= 0.8) return 'bg-warn'
  return 'bg-brand'
}

function Hero({ status }) {
  const daily = status.daily

  return (
    <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand-dark to-slate-900 p-6 text-slate-50">
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-brand/25 blur-3xl" />
      <div className="relative">
        {daily ? (
          <>
            <p className="text-sm text-emerald-200/80">Safe to spend today</p>
            <p
              className={`mt-2 text-4xl font-bold tracking-tight ${
                Number(daily.left_today) < 0 ? 'text-red-300' : ''
              }`}
            >
              {formatMoney(daily.left_today)}
            </p>
            <p className="mt-3 text-sm text-emerald-200/80">
              Today's allowance {formatMoney(daily.today_allowance)} · spent{' '}
              {formatMoney(daily.spent_today)}
            </p>
            <p className="mt-1 text-sm text-emerald-200/60">
              {daily.days_left} days left in the month ·{' '}
              {formatMoney(daily.base_daily)} a day to start with
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-emerald-200/80">Monthly budget</p>
            <p className="mt-2 text-4xl font-bold tracking-tight">
              {formatMoney(status.total_amount)}
            </p>
            <p className="mt-3 text-sm text-emerald-200/80">
              Spent {formatMoney(status.spent_total)} · remaining{' '}
              {formatMoney(status.remaining)}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function Overview({ status }) {
  const total = Number(status.total_amount)
  const spent = Number(status.spent_total)
  const remaining = Number(status.remaining)
  const expected = Number(status.expected_income)
  const planned = Number(status.planned_savings)
  const ratio = total > 0 ? spent / total : 0

  return (
    <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted">Spent this month</span>
        <span className="font-semibold">
          {formatMoney(status.spent_total)} of {formatMoney(status.total_amount)}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-app">
        <div
          className={`h-full rounded-full ${barColor(ratio)}`}
          style={{ width: `${Math.min(100, ratio * 100)}%` }}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-app p-3">
          <p className="text-xs text-muted">
            {remaining < 0 ? 'Over budget' : 'Remaining'}
          </p>
          <p
            className={`mt-0.5 font-bold ${remaining < 0 ? 'text-danger' : ''}`}
          >
            {formatMoney(Math.abs(remaining))}
          </p>
        </div>
        <div className="rounded-xl bg-app p-3">
          <p className="text-xs text-muted">Planned savings</p>
          <p
            className={`mt-0.5 font-bold ${
              expected > 0 && planned < 0 ? 'text-danger' : 'text-brand'
            }`}
          >
            {expected > 0 ? formatMoney(planned) : '—'}
          </p>
        </div>
      </div>

      {expected <= 0 && (
        <p className="mt-3 text-xs text-muted">
          Add expected income for this month to see your planned savings.
        </p>
      )}
      {expected > 0 && planned < 0 && (
        <p className="mt-3 text-xs text-danger">
          Your budget is more than the income you expect this month.
        </p>
      )}
    </div>
  )
}

function CategoryRow({ item, category }) {
  const Icon = getCategoryIcon(category?.icon)
  const allocated = Number(item.allocated)
  const spent = Number(item.spent)
  const ratio = allocated > 0 ? spent / allocated : 0
  const over = spent > allocated

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-2 font-medium">
          <Icon size={16} className="shrink-0 text-brand" />
          <span className="truncate">{category?.name ?? 'Uncategorised'}</span>
        </span>
        <span className="shrink-0 text-muted">
          {formatMoney(item.spent)} / {formatMoney(item.allocated)}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-app">
        <div
          className={`h-full rounded-full ${barColor(ratio)}`}
          style={{ width: `${Math.min(100, ratio * 100)}%` }}
        />
      </div>
      <p
        className={`mt-1.5 text-xs ${
          over ? 'font-medium text-danger' : 'text-muted'
        }`}
      >
        {over
          ? `Over by ${formatMoney(spent - allocated)}`
          : `${formatMoney(item.remaining)} left`}
      </p>
    </div>
  )
}

function Budget() {
  const [month, setMonth] = useState(currentMonth())
  const [status, setStatus] = useState(null)
  const [previous, setPrevious] = useState(null)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const [budget, categoryList] = await Promise.all([
          fetchBudget(month),
          fetchCategories(true),
        ])

        let lastMonth = null
        if (!budget.exists) {
          try {
            const earlier = await fetchBudget(shiftMonth(month, -1))
            lastMonth = earlier.exists ? earlier : null
          } catch {
            lastMonth = null
          }
        }

        if (ignore) return
        setStatus(budget)
        setPrevious(lastMonth)
        setCategories(categoryList)
        setError('')
      } catch (err) {
        if (!ignore) setError(getErrorMessage(err))
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    load()
    return () => {
      ignore = true
    }
  }, [month, version])

  function changeMonth(delta) {
    setLoading(true)
    setMonth((current) => shiftMonth(current, delta))
  }

  function reload() {
    setVersion((current) => current + 1)
  }

  function handleSaved() {
    setModal(null)
    reload()
  }

  const closeModal = useCallback(() => setModal(null), [])

  const categoryMap = Object.fromEntries(
    categories.map((category) => [category.id, category]),
  )
  const exists = status?.exists
  const unallocated = Number(status?.unallocated ?? 0)
  const unbudgeted = Number(status?.unbudgeted_spent ?? 0)

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budget</h1>
          <p className="mt-1 text-muted">Plan it, then stick to it</p>
        </div>
        {!loading && status && (
          <button
            onClick={() => setModal('form')}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand transition hover:brightness-110 active:scale-95"
          >
            {exists ? <Pencil size={16} /> : <Plus size={16} />}
            {exists ? 'Edit' : 'Set up'}
          </button>
        )}
      </div>

      <div className="mt-6">
        <MonthSwitcher
          month={month}
          onPrevious={() => changeMonth(-1)}
          onNext={() => changeMonth(1)}
        />
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-brand" />
        </div>
      )}

      {!loading && exists && (
        <>
          <div className="mt-4">
            <Hero status={status} />
          </div>
          <Overview status={status} />

          <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
              By category
            </h2>

            {status.items.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                No category limits yet. Tap Edit to split your budget into
                categories.
              </p>
            ) : (
              <div className="mt-4 space-y-5">
                {status.items.map((item) => (
                  <CategoryRow
                    key={item.category_id}
                    item={item}
                    category={categoryMap[item.category_id]}
                  />
                ))}
              </div>
            )}

            {unallocated > 0 && (
              <p className="mt-5 text-xs text-muted">
                {formatMoney(unallocated)} of your budget is not assigned to a
                category.
              </p>
            )}
            {unbudgeted > 0 && (
              <p className="mt-2 text-xs text-warn">
                {formatMoney(unbudgeted)} was spent in categories without a
                limit.
              </p>
            )}
          </div>
        </>
      )}

      {!loading && status && !exists && (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Target size={26} />
          </div>
          <p className="mt-4 font-semibold">
            No budget for {formatMonth(month)}
          </p>
          <p className="mt-1 max-w-xs text-sm text-muted">
            Set a monthly budget and MaliFlow will work out how much is safe to
            spend each day.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setModal('form')}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition hover:brightness-110"
            >
              Set up budget
            </button>
            {previous && (
              <button
                onClick={() => setModal('copy')}
                className="flex items-center gap-2 rounded-xl border border-line px-5 py-2.5 text-sm font-medium transition hover:border-brand"
              >
                <Copy size={16} /> Copy {formatMonth(previous.period.slice(0, 7))}
              </button>
            )}
          </div>
        </div>
      )}

      {!loading && (
        <button
          onClick={() => setModal('categories')}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface py-3.5 text-sm font-medium text-muted transition hover:border-brand/50 hover:text-ink"
        >
          <Settings2 size={16} /> Manage categories
        </button>
      )}

      {modal === 'form' && (
        <BudgetModal
          month={month}
          categories={categories}
          initial={exists ? status : null}
          isEdit={Boolean(exists)}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}

      {modal === 'copy' && (
        <BudgetModal
          month={month}
          categories={categories}
          initial={previous}
          isEdit={false}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}

      {modal === 'categories' && (
        <CategoriesModal
          categories={categories}
          onChanged={reload}
          onClose={closeModal}
        />
      )}
    </div>
  )
}

export default Budget