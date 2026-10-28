import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Landmark,
  Loader2,
  PiggyBank,
  Trash2,
} from 'lucide-react'
import MonthSwitcher from '../components/MonthSwitcher'
import SavingsModal from '../components/SavingsModal'
import { fetchAccounts } from '../lib/accounts'
import { getErrorMessage } from '../lib/api'
import {
  currentMonth,
  formatDayLabel,
  formatMoney,
  formatMonth,
  shiftMonth,
} from '../lib/format'
import {
  deleteSavingsEntry,
  fetchSavingsEntries,
  fetchSavingsSummary,
} from '../lib/savings'

function EntryRow({ entry, accountNames, onDelete }) {
  const isDeposit = entry.entry_type === 'savings_deposit'
  const Icon = isDeposit ? ArrowDownToLine : ArrowUpFromLine
  const from = accountNames[entry.from_account_id] ?? 'an account'
  const to = accountNames[entry.to_account_id] ?? 'an account'

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          isDeposit ? 'bg-brand/10 text-brand' : 'bg-warn/10 text-warn'
        }`}
      >
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">
          {entry.description || (isDeposit ? 'Saved money' : 'Withdrawal')}
        </span>
        <span className="block truncate text-sm text-muted">
          {from} → {to} · {formatDayLabel(entry.occurred_on)}
        </span>
      </span>
      <span className={`font-bold ${isDeposit ? 'text-brand' : ''}`}>
        {isDeposit ? '+' : '-'}
        {formatMoney(entry.amount)}
      </span>
      <button
        onClick={() => onDelete(entry)}
        aria-label="Delete entry"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:text-danger"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}

function Savings() {
  const [month, setMonth] = useState(currentMonth())
  const [entries, setEntries] = useState([])
  const [summary, setSummary] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const [entryList, savingsSummary, accountList] = await Promise.all([
          fetchSavingsEntries(month),
          fetchSavingsSummary(month),
          fetchAccounts(),
        ])
        if (ignore) return
        setEntries(entryList)
        setSummary(savingsSummary)
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

  async function handleDelete(entry) {
    if (!window.confirm('Delete this entry? The money goes back where it came from.')) {
      return
    }
    setError('')
    try {
      await deleteSavingsEntry(entry.id)
      setVersion((current) => current + 1)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const closeModal = useCallback(() => setModal(null), [])

  const accountNames = Object.fromEntries(
    accounts.map((account) => [account.id, account.name]),
  )
  const savingsAccounts = accounts.filter((account) => account.pool === 'savings')

  const netSaved = Number(summary?.net_saved ?? 0)
  const planned = summary?.planned_savings == null ? null : Number(summary.planned_savings)
  const leftUnsaved = Number(summary?.left_unsaved ?? 0)
  const progress =
    planned && planned > 0 ? Math.min(100, Math.max(0, (netSaved / planned) * 100)) : 0

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Savings</h1>
        <p className="mt-1 text-muted">Money you set aside on purpose</p>
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
        <div className="relative mt-6 overflow-hidden rounded-3xl bg-linear-to-br from-brand-dark to-slate-900 p-6 text-slate-50">
          <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-brand/25 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm text-emerald-200/80">
              <PiggyBank size={16} /> Total saved
            </div>
            <p className="mt-2 text-4xl font-bold tracking-tight">
              {formatMoney(summary.savings_balance)}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setModal('deposit')}
                className="flex items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-on-brand transition hover:brightness-110 active:scale-95"
              >
                <ArrowDownToLine size={16} /> Save money
              </button>
              <button
                onClick={() => setModal('withdraw')}
                className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-sm font-semibold transition hover:bg-white/15 active:scale-95"
              >
                <ArrowUpFromLine size={16} /> Withdraw
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <MonthSwitcher
          month={month}
          onPrevious={() => changeMonth(-1)}
          onNext={() => changeMonth(1)}
        />
      </div>

      {!loading && summary && (
        <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted">Saved in {formatMonth(month)}</span>
            <span className="font-semibold">
              {formatMoney(summary.net_saved)}
              {planned !== null && ` of ${formatMoney(planned)} planned`}
            </span>
          </div>

          {planned !== null && planned > 0 ? (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-app">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted">
              {planned === null
                ? 'Set a budget for this month to see your planned savings.'
                : 'Your budget leaves nothing to save this month.'}
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-app p-3">
              <p className="text-xs text-muted">Deposited</p>
              <p className="mt-0.5 font-bold text-brand">
                {formatMoney(summary.deposited)}
              </p>
            </div>
            <div className="rounded-xl bg-app p-3">
              <p className="text-xs text-muted">Withdrawn</p>
              <p className="mt-0.5 font-bold">{formatMoney(summary.withdrawn)}</p>
            </div>
          </div>

          {leftUnsaved > 0 && (
            <div className="mt-4 rounded-xl bg-warn/10 p-3 text-sm">
              <p className="font-medium text-warn">
                {formatMoney(summary.left_unsaved)} unspent, but not saved
              </p>
              <p className="mt-1 text-xs text-muted">
                That is your income this month minus what you spent and saved.
                Money that just sits there is easy to lose track of.
              </p>
              <button
                onClick={() => setModal('deposit')}
                className="mt-2 text-sm font-semibold text-brand"
              >
                Move it to savings
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">
            Savings accounts
          </h2>
          {savingsAccounts.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-10 text-center">
              <p className="font-semibold">No savings account yet</p>
              <p className="mt-1 max-w-xs text-sm text-muted">
                Create an account in the Savings pool to start setting money
                aside.
              </p>
              <Link
                to="/accounts"
                className="mt-4 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition hover:brightness-110"
              >
                Go to Accounts
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {savingsAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <Landmark size={20} />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {account.name}
                  </span>
                  <span className="font-bold">{formatMoney(account.balance)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {!loading && entries.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">
            Activity
          </h2>
          <div className="space-y-3">
            {entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                accountNames={accountNames}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </section>
      )}

      {!loading && !error && entries.length === 0 && savingsAccounts.length > 0 && (
        <p className="mt-8 text-center text-sm text-muted">
          No savings activity in {formatMonth(month)}.
        </p>
      )}

      {modal && (
        <SavingsModal
          mode={modal}
          accounts={accounts}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

export default Savings