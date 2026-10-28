import { useEffect, useState } from 'react'
import { Banknote, HandCoins, PiggyBank, Receipt, TrendingUp, Wallet } from 'lucide-react'
import AlertsCard from '../components/AlertsCard'
import NetWorthCard from '../components/NetWorthCard'
import { useAuth } from '../context/AuthContext'
import { fetchAccountSummary } from '../lib/accounts'
import { fetchBudget } from '../lib/budgets'
import { fetchExpenseSummary } from '../lib/expenses'
import { currentMonth, formatMoney } from '../lib/format'
import { fetchIncomeSummary } from '../lib/income'
import { fetchInvestmentSummary } from '../lib/investments'
import { fetchObligationSummary } from '../lib/obligations'

const stats = [
  { key: 'income', label: 'Income this month', icon: Banknote },
  { key: 'expenses', label: 'Spent this month', icon: Receipt },
  { key: 'savings', label: 'Savings', icon: PiggyBank },
  { key: 'investments', label: 'Investments', icon: TrendingUp },
  { key: 'obligations', label: 'Obligations', icon: HandCoins },
]

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function Home() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [incomeSummary, setIncomeSummary] = useState(null)
  const [expenseSummary, setExpenseSummary] = useState(null)
  const [budget, setBudget] = useState(null)
  const [obligationSummary, setObligationSummary] = useState(null)
  const [investmentSummary, setInvestmentSummary] = useState(null)
  const firstName = user.full_name.trim().split(' ')[0]

  useEffect(() => {
    const month = currentMonth()
    fetchAccountSummary()
      .then(setSummary)
      .catch(() => setSummary(null))
    fetchIncomeSummary(month)
      .then(setIncomeSummary)
      .catch(() => setIncomeSummary(null))
    fetchExpenseSummary(month)
      .then(setExpenseSummary)
      .catch(() => setExpenseSummary(null))
    fetchBudget(month)
      .then(setBudget)
      .catch(() => setBudget(null))
    fetchObligationSummary()
      .then(setObligationSummary)
      .catch(() => setObligationSummary(null))
    fetchInvestmentSummary()
      .then(setInvestmentSummary)
      .catch(() => setInvestmentSummary(null))
  }, [])

  const values = {
    income: incomeSummary?.received_total ?? 0,
    expenses: expenseSummary?.total ?? 0,
    savings: summary?.savings ?? 0,
    investments: investmentSummary?.total_value ?? 0,
    obligations: obligationSummary?.total_outstanding ?? 0,
  }

  const daily = budget?.daily
  const leftToday = Number(daily?.left_today ?? 0)

  return (
    <div>
      <p className="text-muted">{greeting()},</p>
      <h1 className="text-2xl font-bold tracking-tight">{firstName}</h1>

      <div className="relative mt-6 overflow-hidden rounded-3xl bg-linear-to-br from-brand-dark to-slate-900 p-6 text-slate-50">
        <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-brand/25 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-sm text-emerald-200/80">
            <Wallet size={16} /> Available Funds
          </div>
          <div className="mt-2 text-4xl font-bold tracking-tight">
            {formatMoney(summary?.available ?? 0)}
          </div>
          {daily ? (
            <p
              className={`mt-3 text-sm ${
                leftToday < 0 ? 'text-red-300' : 'text-emerald-200/80'
              }`}
            >
              Left to spend today: {formatMoney(daily.left_today)}
            </p>
          ) : (
            <p className="mt-3 text-sm text-emerald-200/70">
              Spent today: {formatMoney(expenseSummary?.today_total ?? 0)}
            </p>
          )}
        </div>
      </div>

      <AlertsCard />

      <NetWorthCard />

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.key}
            className="rounded-2xl border border-line bg-surface p-4"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <stat.icon size={18} />
            </div>
            <p className="mt-3 text-sm text-muted">{stat.label}</p>
            <p className="mt-0.5 text-xl font-bold">
              {formatMoney(values[stat.key] ?? 0)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Home