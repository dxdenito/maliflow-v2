import { useCallback, useEffect, useState } from 'react'
import { Banknote, ChevronRight, Loader2, Plus } from 'lucide-react'
import IncomeDetailModal from '../components/IncomeDetailModal'
import IncomeModal from '../components/IncomeModal'
import MonthSwitcher from '../components/MonthSwitcher'
import ReceiveModal from '../components/ReceiveModal'
import { incomeTypeMap } from '../config/incomeTypes'
import { fetchAccounts } from '../lib/accounts'
import { getErrorMessage } from '../lib/api'
import {
  currentMonth,
  formatDate,
  formatMoney,
  shiftMonth,
  todayISO,
} from '../lib/format'
import { fetchIncome, fetchIncomeSummary } from '../lib/income'

function IncomeRow({ item, accountName, onClick }) {
  const type = incomeTypeMap[item.income_type] ?? incomeTypeMap.other
  const isPending = item.status === 'expected'
  const isLate = isPending && item.expected_on < todayISO()

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-brand/50 active:scale-[0.99]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <type.icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{item.source}</span>
        <span className="block text-sm text-muted">
          {isPending ? (
            <>
              Expected {formatDate(item.expected_on)}
              {isLate && <span className="font-medium text-warn"> · late</span>}
            </>
          ) : (
            <>
              Received {formatDate(item.received_on)} · {accountName}
            </>
          )}
        </span>
      </span>
      {isPending ? (
        <>
          <span className="font-bold text-muted">
            {formatMoney(item.expected_amount)}
          </span>
          <ChevronRight size={16} className="text-muted" />
        </>
      ) : (
        <span className="font-bold text-brand">
          +{formatMoney(item.received_amount)}
        </span>
      )}
    </button>
  )
}

function IncomeGroup({ title, items, accountNames, onSelect }) {
  if (items.length === 0) {
    return null
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">
        {title}
      </h2>
      <div className="space-y-3">
        {items.map((item) => (
          <IncomeRow
            key={item.id}
            item={item}
            accountName={accountNames[item.account_id] ?? 'an account'}
            onClick={() => onSelect(item)}
          />
        ))}
      </div>
    </section>
  )
}

function Income() {
  const [month, setMonth] = useState(currentMonth())
  const [items, setItems] = useState([])
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
        const [incomeList, incomeSummary, accountList] = await Promise.all([
          fetchIncome(month),
          fetchIncomeSummary(month),
          fetchAccounts(),
        ])
        if (ignore) return
        setItems(incomeList)
        setSummary(incomeSummary)
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

  const closeModal = useCallback(() => setModal(null), [])

  const accountNames = Object.fromEntries(
    accounts.map((account) => [account.id, account.name]),
  )
  const pending = items.filter((item) => item.status === 'expected')
  const received = items.filter((item) => item.status === 'received')

  const expectedTotal = Number(summary?.expected_total ?? 0)
  const receivedTotal = Number(summary?.received_total ?? 0)
  const progress =
    expectedTotal > 0 ? Math.min(100, (receivedTotal / expectedTotal) * 100) : 0

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Income</h1>
          <p className="mt-1 text-muted">What comes in, and when</p>
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
            <p className="text-sm text-emerald-200/80">Received this month</p>
            <p className="mt-2 text-4xl font-bold tracking-tight">
              {formatMoney(summary.received_total)}
            </p>
            <p className="mt-1 text-sm text-emerald-200/70">
              of {formatMoney(summary.expected_total)} expected
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-emerald-200/80">
              Still to come: {formatMoney(summary.pending_total)}
            </p>
          </div>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Banknote size={26} />
          </div>
          <p className="mt-4 font-semibold">No income for this month</p>
          <p className="mt-1 max-w-xs text-sm text-muted">
            Add your salary, side hustles or anything else you expect or have
            received.
          </p>
          <button
            onClick={() => setModal('new')}
            className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition hover:brightness-110"
          >
            Add income
          </button>
        </div>
      )}

      {!loading && (
        <>
          <IncomeGroup
            title="Waiting to arrive"
            items={pending}
            accountNames={accountNames}
            onSelect={setModal}
          />
          <IncomeGroup
            title="Received"
            items={received}
            accountNames={accountNames}
            onSelect={setModal}
          />
        </>
      )}

      {modal === 'new' && (
        <IncomeModal
          accounts={accounts}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}

      {modal && modal !== 'new' && modal.status === 'expected' && (
        <ReceiveModal
          income={modal}
          accounts={accounts}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}

      {modal && modal !== 'new' && modal.status === 'received' && (
        <IncomeDetailModal
          income={modal}
          accountName={accountNames[modal.account_id] ?? 'an account'}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

export default Income