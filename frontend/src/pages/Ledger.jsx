import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeftRight,
  BookOpen,
  Loader2,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import AdjustmentModal from '../components/AdjustmentModal'
import MonthSwitcher from '../components/MonthSwitcher'
import TransferModal from '../components/TransferModal'
import { ledgerTypeMap, ledgerTypes, manualTypes } from '../config/ledgerTypes'
import { fetchAccounts } from '../lib/accounts'
import { getErrorMessage } from '../lib/api'
import {
  currentMonth,
  formatDayLabel,
  formatMoney,
  shiftMonth,
} from '../lib/format'
import { signedMoney } from '../lib/investments'
import {
  deleteLedgerEntry,
  entryDirection,
  fetchLedger,
  fetchLedgerSummary,
} from '../lib/ledger'
import { inputClass } from '../lib/styles'

function groupByDay(entries) {
  const days = []
  for (const entry of entries) {
    const last = days[days.length - 1]
    if (last && last.date === entry.occurred_on) {
      last.items.push(entry)
    } else {
      days.push({ date: entry.occurred_on, items: [entry] })
    }
  }
  return days
}

function EntryRow({ entry, accountNames, filterAccountId, busy, onDelete }) {
  const type = ledgerTypeMap[entry.entry_type] ?? ledgerTypeMap.adjustment
  const Icon = type.icon
  const direction = entryDirection(entry, filterAccountId)
  const from = accountNames[entry.from_account_id] ?? 'an account'
  const to = accountNames[entry.to_account_id] ?? 'an account'

  let detail
  if (entry.from_account_id && entry.to_account_id) {
    if (filterAccountId) {
      detail = direction === 'in' ? `from ${from}` : `to ${to}`
    } else {
      detail = `${from} → ${to}`
    }
  } else {
    detail = direction === 'in' ? `into ${to}` : `from ${from}`
  }

  const sign = direction === 'in' ? '+' : direction === 'out' ? '-' : ''
  const canDelete = manualTypes.includes(entry.entry_type)

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">
          {entry.description || type.label}
        </span>
        <span className="block truncate text-sm text-muted">
          {type.label} · {detail}
        </span>
      </span>
      <span
        className={`font-bold ${direction === 'in' ? 'text-brand' : ''}`}
      >
        {sign}
        {formatMoney(entry.amount)}
      </span>
      {canDelete && (
        <button
          onClick={() => onDelete(entry)}
          disabled={busy}
          aria-label="Delete entry"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:text-danger disabled:opacity-50"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  )
}

function Ledger() {
  const [month, setMonth] = useState(currentMonth())
  const [typeFilter, setTypeFilter] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [entries, setEntries] = useState([])
  const [summary, setSummary] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [version, setVersion] = useState(0)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const [list, ledgerSummary, accountList] = await Promise.all([
          fetchLedger(month, { type: typeFilter, accountId: accountFilter }),
          fetchLedgerSummary(month),
          fetchAccounts(true),
        ])
        if (ignore) return
        setEntries(list)
        setSummary(ledgerSummary)
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
  }, [month, typeFilter, accountFilter, version])

  function changeMonth(delta) {
    setLoading(true)
    setMonth((current) => shiftMonth(current, delta))
  }

  function changeType(event) {
    setLoading(true)
    setTypeFilter(event.target.value)
  }

  function changeAccount(event) {
    setLoading(true)
    setAccountFilter(event.target.value)
  }

  function handleSaved() {
    setModal(null)
    setVersion((current) => current + 1)
  }

  async function handleDelete(entry) {
    if (
      !window.confirm('Delete this entry? The balances go back to what they were.')
    ) {
      return
    }
    setError('')
    setBusyId(entry.id)
    try {
      await deleteLedgerEntry(entry.id)
      setVersion((current) => current + 1)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const closeModal = useCallback(() => setModal(null), [])

  const accountNames = Object.fromEntries(
    accounts.map((account) => [account.id, account.name]),
  )
  const days = groupByDay(entries)
  const net = summary ? Number(summary.money_in) - Number(summary.money_out) : 0
  const adjustments = Number(summary?.adjustments_net ?? 0)
  const filtered = Boolean(typeFilter || accountFilter)

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ledger</h1>
        <p className="mt-1 text-muted">Every movement of your money</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={() => setModal('adjust')}
          className="flex items-center justify-center gap-2 rounded-xl border border-line bg-surface py-3 text-sm font-medium transition hover:border-brand active:scale-95"
        >
          <SlidersHorizontal size={16} /> Adjust balance
        </button>
        <button
          onClick={() => setModal('transfer')}
          className="flex items-center justify-center gap-2 rounded-xl border border-line bg-surface py-3 text-sm font-medium transition hover:border-brand active:scale-95"
        >
          <ArrowLeftRight size={16} /> Move money
        </button>
      </div>

      <div className="mt-4">
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

      {!loading && summary && (
        <div className="relative mt-4 overflow-hidden rounded-3xl bg-linear-to-br from-brand-dark to-slate-900 p-6 text-slate-50">
          <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-brand/25 blur-3xl" />
          <div className="relative">
            <p className="text-sm text-emerald-200/80">Net movement</p>
            <p
              className={`mt-2 text-4xl font-bold tracking-tight ${
                net < 0 ? 'text-red-300' : ''
              }`}
            >
              {signedMoney(net)}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-xs text-emerald-200/70">Money in</p>
                <p className="mt-0.5 font-semibold">
                  {formatMoney(summary.money_in)}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-xs text-emerald-200/70">Money out</p>
                <p className="mt-0.5 font-semibold">
                  {formatMoney(summary.money_out)}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-emerald-200/70">
              {summary.entry_count} entries this month
              {adjustments !== 0 &&
                ` · adjustments ${signedMoney(adjustments)}`}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <select
          aria-label="Filter by type"
          value={typeFilter}
          onChange={changeType}
          className={`${inputClass} py-2.5 text-sm`}
        >
          <option value="">All types</option>
          {ledgerTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by account"
          value={accountFilter}
          onChange={changeAccount}
          className={`${inputClass} py-2.5 text-sm`}
        >
          <option value="">All accounts</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-brand" />
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <BookOpen size={26} />
          </div>
          <p className="mt-4 font-semibold">
            {filtered ? 'Nothing matches these filters' : 'No entries this month'}
          </p>
          <p className="mt-1 max-w-xs text-sm text-muted">
            {filtered
              ? 'Try a different type or account, or clear the filters.'
              : 'Every income, expense, payment and transfer shows up here.'}
          </p>
        </div>
      )}

      {!loading &&
        days.map((day) => (
          <section key={day.date} className="mt-8">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">
              {formatDayLabel(day.date)}
            </h2>
            <div className="space-y-3">
              {day.items.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  accountNames={accountNames}
                  filterAccountId={accountFilter}
                  busy={busyId === entry.id}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </section>
        ))}

      {modal === 'adjust' && (
        <AdjustmentModal
          accounts={accounts}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}

      {modal === 'transfer' && (
        <TransferModal
          accounts={accounts}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

export default Ledger