import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Info,
  Loader2,
} from 'lucide-react'
import DailyChart from '../components/DailyChart'
import MonthSwitcher from '../components/MonthSwitcher'
import TrendChart from '../components/TrendChart'
import { getCategoryIcon } from '../config/categoryIcons'
import { getErrorMessage } from '../lib/api'
import { fetchCategories } from '../lib/categories'
import {
  currentMonth,
  formatDate,
  formatMoney,
  formatMonth,
  shiftMonth,
} from '../lib/format'
import { signedMoney } from '../lib/investments'
import { fetchMonthReport, fetchTrend, percentText } from '../lib/reports'

const severityStyles = {
  warning: { icon: AlertTriangle, tone: 'text-warn', box: 'bg-warn/10' },
  info: { icon: Info, tone: 'text-muted', box: 'bg-app' },
  good: { icon: CheckCircle2, tone: 'text-brand', box: 'bg-brand/10' },
}

function plain(value) {
  const number = Number(value)
  return number < 0 ? `-${formatMoney(-number)}` : formatMoney(number)
}

function Section({ title, children }) {
  return (
    <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Hero({ report, month }) {
  const hasIncome = Number(report.income_received) > 0

  return (
    <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand-dark to-slate-900 p-6 text-slate-50">
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-brand/25 blur-3xl" />
      <div className="relative">
        {hasIncome ? (
          <>
            <p className="text-sm text-emerald-200/80">
              Saved in {formatMonth(month)}
            </p>
            <p className="mt-2 text-4xl font-bold tracking-tight">
              {percentText(report.savings_rate)}
            </p>
            <p className="mt-1 text-sm text-emerald-200/70">of your income</p>
          </>
        ) : (
          <>
            <p className="text-sm text-emerald-200/80">
              Spent in {formatMonth(month)}
            </p>
            <p className="mt-2 text-4xl font-bold tracking-tight">
              {formatMoney(report.spent_total)}
            </p>
            <p className="mt-1 text-sm text-emerald-200/70">
              No income recorded for this month
            </p>
          </>
        )}

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-xs text-emerald-200/70">Income</p>
            <p className="mt-0.5 text-sm font-semibold">
              {formatMoney(report.income_received)}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-xs text-emerald-200/70">Spent</p>
            <p className="mt-0.5 text-sm font-semibold">
              {formatMoney(report.spent_total)}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-xs text-emerald-200/70">Saved</p>
            <p className="mt-0.5 text-sm font-semibold">
              {signedMoney(report.use.saved)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function InsightRow({ insight }) {
  const style = severityStyles[insight.severity] ?? severityStyles.info
  const Icon = style.icon

  return (
    <div className="flex items-start gap-3 py-3">
      <span
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.box} ${style.tone}`}
      >
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{insight.title}</span>
        <span className="mt-0.5 block text-sm text-muted">{insight.detail}</span>
      </span>
      {insight.amount && (
        <span className={`shrink-0 text-sm font-bold ${style.tone}`}>
          {formatMoney(insight.amount)}
        </span>
      )}
    </div>
  )
}

function UseRow({ label, value, income, highlight }) {
  const number = Number(value)
  const share =
    income > 0 ? Math.min(100, (Math.abs(number) / income) * 100) : 0

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className={highlight ? 'font-semibold' : 'font-medium'}>
          {label}
        </span>
        <span className="shrink-0 text-muted">
          {plain(number)}
          {income > 0 && ` · ${percentText((number / income) * 100)}`}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-app">
        <div
          className={`h-full rounded-full ${
            number < 0 ? 'bg-danger' : highlight ? 'bg-warn' : 'bg-brand'
          }`}
          style={{ width: `${share}%` }}
        />
      </div>
    </div>
  )
}

function CategoryRow({ row, icon }) {
  const Icon = getCategoryIcon(icon)
  const change = row.change_pct === null ? null : Number(row.change_pct)
  const limit = row.limit === null ? null : Number(row.limit)
  const over = limit !== null && Number(row.amount) > limit

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-2 font-medium">
          <Icon size={16} className="shrink-0 text-brand" />
          <span className="truncate">{row.name}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {change === null ? (
            <span className="text-xs text-muted">new</span>
          ) : Math.abs(change) < 1 ? (
            <span className="text-xs text-muted">no change</span>
          ) : (
            <span
              className={`flex items-center text-xs font-semibold ${
                change > 0 ? 'text-warn' : 'text-brand'
              }`}
            >
              {change > 0 ? (
                <ArrowUpRight size={14} />
              ) : (
                <ArrowDownRight size={14} />
              )}
              {Math.abs(change).toFixed(0)}%
            </span>
          )}
          <span className="font-semibold">{formatMoney(row.amount)}</span>
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-app">
        <div
          className={`h-full rounded-full ${over ? 'bg-danger' : 'bg-brand'}`}
          style={{ width: `${Math.min(100, Number(row.share ?? 0))}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-muted">
        {percentText(row.share)} of spending · {row.transactions}{' '}
        {row.transactions === 1 ? 'expense' : 'expenses'}
        {limit !== null && (
          <span className={over ? 'font-medium text-danger' : ''}>
            {' '}
            · limit {formatMoney(limit)}
          </span>
        )}
      </p>
    </div>
  )
}

function Reports() {
  const [month, setMonth] = useState(currentMonth())
  const [report, setReport] = useState(null)
  const [trend, setTrend] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const [monthReport, trendData, categoryList] = await Promise.all([
          fetchMonthReport(month),
          fetchTrend(month, 6),
          fetchCategories(true),
        ])
        if (ignore) return
        setReport(monthReport)
        setTrend(trendData.points)
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
  }, [month])

  function changeMonth(delta) {
    setLoading(true)
    setMonth((current) => shiftMonth(current, delta))
  }

  const categoryMap = Object.fromEntries(
    categories.map((category) => [category.id, category]),
  )
  const income = Number(report?.income_received ?? 0)
  const empty =
    report && Number(report.spent_total) === 0 && income === 0

  const useRows = report
    ? [
        { key: 'spent', label: 'Spent on expenses', value: report.use.spent },
        {
          key: 'obligations_paid',
          label: 'Paid toward debts',
          value: report.use.obligations_paid,
        },
        {
          key: 'purchases_paid',
          label: 'Paid toward purchases',
          value: report.use.purchases_paid,
        },
        { key: 'saved', label: 'Saved', value: report.use.saved },
        { key: 'invested', label: 'Invested', value: report.use.invested },
        {
          key: 'left_over',
          label: 'Not accounted for',
          value: report.use.left_over,
        },
      ].filter(
        (row) =>
          Number(row.value) !== 0 ||
          row.key === 'spent' ||
          row.key === 'left_over',
      )
    : []

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="mt-1 text-muted">Spot patterns and plug the leaks</p>
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

      {!loading && report && (
        <>
          <div className="mt-4">
            <Hero report={report} month={month} />
          </div>

          {empty ? (
            <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <BarChart3 size={26} />
              </div>
              <p className="mt-4 font-semibold">No activity this month</p>
              <p className="mt-1 max-w-xs text-sm text-muted">
                Record income and expenses and your report fills in by itself.
              </p>
            </div>
          ) : (
            <>
              {report.insights.length > 0 && (
                <Section title="What stands out">
                  <div className="-my-3 divide-y divide-line">
                    {report.insights.map((insight, index) => (
                      <InsightRow
                        key={`${insight.kind}-${index}`}
                        insight={insight}
                      />
                    ))}
                  </div>
                </Section>
              )}

              <Section title="Where your income went">
                <div className="space-y-4">
                  {useRows.map((row) => (
                    <UseRow
                      key={row.key}
                      label={row.label}
                      value={row.value}
                      income={income}
                      highlight={row.key === 'left_over'}
                    />
                  ))}
                </div>
                {income === 0 && (
                  <p className="mt-4 text-xs text-muted">
                    Record income for this month to see percentages.
                  </p>
                )}
              </Section>

              {report.categories.length > 0 && (
                <Section title="Spending by category">
                  <div className="space-y-5">
                    {report.categories.map((row) => (
                      <CategoryRow
                        key={row.category_id}
                        row={row}
                        icon={categoryMap[row.category_id]?.icon}
                      />
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-muted">
                    The arrow compares each category with last month.
                  </p>
                </Section>
              )}

              {report.daily.length > 0 && (
                <Section title="Daily spending">
                  <DailyChart
                    daily={report.daily}
                    budget={report.daily_budget}
                  />
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-app p-3">
                      <p className="text-xs text-muted">Average per day</p>
                      <p className="mt-0.5 font-bold">
                        {formatMoney(report.average_per_day)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-app p-3">
                      <p className="text-xs text-muted">Days over budget</p>
                      <p className="mt-0.5 font-bold">
                        {report.daily_budget === null
                          ? '—'
                          : `${report.days_over_budget} of ${report.daily.length}`}
                      </p>
                    </div>
                  </div>
                </Section>
              )}

              {report.top_expenses.length > 0 && (
                <Section title="Biggest expenses">
                  <div className="-my-3 divide-y divide-line">
                    {report.top_expenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="flex items-center gap-3 py-3"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {expense.label}
                          </span>
                          <span className="block truncate text-xs text-muted">
                            {categoryMap[expense.category_id]?.name ??
                              'Uncategorised'}{' '}
                            · {formatDate(expense.spent_on)}
                          </span>
                        </span>
                        <span className="font-bold">
                          {formatMoney(expense.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}

          <Section title="Last 6 months">
            <TrendChart points={trend} />
          </Section>
        </>
      )}
    </div>
  )
}

export default Reports