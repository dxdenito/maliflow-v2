import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, Plus, Receipt } from 'lucide-react'
import ExpenseModal from '../components/ExpenseModal'
import MonthSwitcher from '../components/MonthSwitcher'
import { getCategoryIcon } from '../config/categoryIcons'
import { fetchAccounts } from '../lib/accounts'
import { getErrorMessage } from '../lib/api'
import { fetchCategories } from '../lib/categories'
import { fetchExpenses, fetchExpenseSummary } from '../lib/expenses'
import {
  currentMonth,
  formatDayLabel,
  formatMoney,
  formatMonth,
  shiftMonth,
} from '../lib/format'

function ExpenseRow({ expense, category, accountName, onClick }) {
  const Icon = getCategoryIcon(category?.icon)

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-brand/50 active:scale-[0.99]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">
          {expense.description || category?.name || 'Expense'}
        </span>
        <span className="block truncate text-sm text-muted">
          {category?.name ?? 'Uncategorised'} · {accountName}
        </span>
      </span>
      <span className="font-bold">-{formatMoney(expense.amount)}</span>
    </button>
  )
}

function groupByDay(expenses) {
  const days = []
  for (const expense of expenses) {
    const last = days[days.length - 1]
    if (last && last.date === expense.spent_on) {
      last.items.push(expense)
      last.total += Number(expense.amount)
    } else {
      days.push({
        date: expense.spent_on,
        items: [expense],
        total: Number(expense.amount),
      })
    }
  }
  return days
}

function Expenses() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [month, setMonth] = useState(currentMonth())
  const [expenses, setExpenses] = useState([])
  const [summary, setSummary] = useState(null)
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (searchParams.get('add')) {
      setModal('new')
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const [expenseList, expenseSummary, categoryList, accountList] =
          await Promise.all([
            fetchExpenses(month),
            fetchExpenseSummary(month),
            fetchCategories(true),
            fetchAccounts(true),
          ])
        if (ignore) return
        setExpenses(expenseList)
        setSummary(expenseSummary)
        setCategories(categoryList)
        setAccounts(accountList)
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

  function handleSaved() {
    setModal(null)
    setVersion((current) => current + 1)
  }

  function handleCategoryCreated(category) {
    setCategories((current) => [...current, category])
  }

  const closeModal = useCallback(() => setModal(null), [])

  const categoryMap = Object.fromEntries(
    categories.map((category) => [category.id, category]),
  )
  const accountNames = Object.fromEntries(
    accounts.map((account) => [account.id, account.name]),
  )
  const days = groupByDay(expenses)
  const isCurrentMonth = month === currentMonth()
  const monthTotal = Number(summary?.total ?? 0)
  const topCategories = (summary?.by_category ?? []).slice(0, 5)

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="mt-1 text-muted">Where your money goes</p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand transition hover:brightness-110 active:scale-95"
        >
          <Plus size={16} /> Add
        </button>
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

      {!loading && summary && (
        <div className="relative mt-4 overflow-hidden rounded-3xl bg-linear-to-br from-brand-dark to-slate-900 p-6 text-slate-50">
          <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-brand/25 blur-3xl" />
          <div className="relative">
            <p className="text-sm text-emerald-200/80">
              Spent in {formatMonth(month)}
            </p>
            <p className="mt-2 text-4xl font-bold tracking-tight">
              {formatMoney(summary.total)}
            </p>
            {isCurrentMonth && (
              <p className="mt-3 text-sm text-emerald-200/80">
                Today: {formatMoney(summary.today_total)}
              </p>
            )}
          </div>
        </div>
      )}

      {!loading && topCategories.length > 0 && (
        <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
            By category
          </h2>
          <div className="mt-4 space-y-4">
            {topCategories.map((item) => {
              const category = categoryMap[item.category_id]
              const Icon = getCategoryIcon(category?.icon)
              const share =
                monthTotal > 0 ? (Number(item.total) / monthTotal) * 100 : 0

              return (
                <div key={item.category_id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2 font-medium">
                      <Icon size={16} className="shrink-0 text-brand" />
                      <span className="truncate">
                        {category?.name ?? 'Uncategorised'}
                      </span>
                    </span>
                    <span className="shrink-0 text-muted">
                      {formatMoney(item.total)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-app">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!loading && !error && expenses.length === 0 && (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Receipt size={26} />
          </div>
          <p className="mt-4 font-semibold">No expenses for this month</p>
          <p className="mt-1 max-w-xs text-sm text-muted">
            Log what you spend as you go, and MaliFlow will show you where it
            all goes.
          </p>
          <button
            onClick={() => setModal('new')}
            className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition hover:brightness-110"
          >
            Add an expense
          </button>
        </div>
      )}

      {!loading &&
        days.map((day) => (
          <section key={day.date} className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
                {formatDayLabel(day.date)}
              </h2>
              <span className="text-sm text-muted">
                {formatMoney(day.total)}
              </span>
            </div>
            <div className="space-y-3">
              {day.items.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  category={categoryMap[expense.category_id]}
                  accountName={
                    expense.account_id
                      ? (accountNames[expense.account_id] ?? 'an account')
                      : expense.obligation_id
                        ? 'Owed to someone'
                        : 'Paid by someone else'
                  }
                  onClick={() => setModal(expense)}
                />
              ))}
            </div>
          </section>
        ))}

      {modal && (
        <ExpenseModal
          expense={modal === 'new' ? null : modal}
          categories={categories}
          accounts={accounts}
          onCategoryCreated={handleCategoryCreated}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

export default Expenses