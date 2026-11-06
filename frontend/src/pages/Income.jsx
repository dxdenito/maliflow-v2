import { useCallback, useEffect, useState } from 'react'
import { Banknote, ChevronRight, Loader2, Plus } from 'lucide-react'
import IncomeDetailModal from '../components/IncomeDetailModal'
import IncomeEditModal from '../components/IncomeEditModal'
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

function IncomeRow({ item, accountNames, onClick }) {
  const type = incomeTypeMap[item.income_type] ?? incomeTypeMap.other
  const pending = item.status !== 'received'
  const partial = item.status === 'partial'
  const isLate = pending && item.expected_on < todayISO()
  const last = item.receipts[0]
  const expected = Number(item.expected_amount)
  const received = Number(item.received_total)
  const progress = expected > 0 ? Math.min(100, (received / expected) * 100) : 0

  const late = isLate && <span className="font-medium text-warn"> · late</span>

  let subtitle
  if (item.status === 'expected') {
    subtitle = (
      <>
        Expected {formatDate(item.expected_on)}
        {late}
      </>
    )
  } else if (partial) {
    subtitle = (
      <>
        {formatMoney(item.remaining)} still to come
        {late}
      </>
    )
  } else {
    subtitle = (
      <>
        Received {formatDate(last.received_on)} ·{' '}
        {item.receipts.length > 1
          ? `${item.receipts.length} payments`
          : (accountNames[last.account_id] ?? 'an account')}
      </>
    )
  }

  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-brand/50 active:scale-[0.99]"
    >
      <div className="flex items-center gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <type.icon size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{item.source}</span>
          <span className="block text-sm text-muted">{subtitle}</span>
        </span>
        <span className="text-right">
          {item.status === 'expected' ? (
            <span className="block font-bold text-muted">
              {formatMoney(expected)}
            </span>
          ) : (
            <>
              <span className="block font-bold text-brand">
                +{formatMoney(received)}
              </span>
              {partial && (
                <span className="block text-xs text-muted">
                  of {formatMoney(expected)}
                </span>
              )}
            </>
          )}
        </span>
        <ChevronRight size={16} className="shrink-0 text-muted" />
      </div>
      {partial && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-app">
          <div
            className="h-full rounded-full bg-brand"
            style={{ width: `${progress}%` }}
          />
        </div>
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
            accountNames={accountNames}
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
          fetchAccounts(true),
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

  function reload() {
    setVersion((current) => current + 1)
  }

  function handleSaved(id) {
    setModal(id ? { type: 'detail', id } : null)
    reload()
  }

  const closeModal = useCallback(() => setModal(null), [])

  const accountNames = Object.fromEntries(
    accounts.map((account) => [account.id, account.name]),
  )
  const selected = modal?.id ? items.find((item) => item.id === modal.id) : null
  const pending = items.filter((item) => item.status !== 'received')
  const received = items.filter((item) => item.status === 'received')

  const expectedTotal = Number(summary?.expected_total ?? 0)
  const receivedTotal = Number(summary?.received_total ?? 0)
  const progress =
    expectedTotal > 0 ? Math.min(100, (receivedTotal / expectedTotal) * 100) : 0

  function backToDetail() {
    setModal({ type: 'detail', id: selected.id })
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Income</h1>
          <p className="mt-1 text-muted">What comes in, and when</p>
        </div>
        <button
          onClick={() => setModal({ type: 'new' })}
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
            onClick={() => setModal({ type: 'new' })}
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
            onSelect={(item) => setModal({ type: 'detail', id: item.id })}
          />
          <IncomeGroup
            title="Received"
            items={received}
            accountNames={accountNames}
            onSelect={(item) => setModal({ type: 'detail', id: item.id })}
          />
        </>
      )}

      {modal?.type === 'new' && (
        <IncomeModal
          accounts={accounts.filter((account) => account.is_active)}
          onClose={closeModal}
          onSaved={() => handleSaved(null)}
        />
      )}

      {modal?.type === 'receive' && selected && (
        <ReceiveModal
          income={selected}
          accounts={accounts}
          onClose={backToDetail}
          onSaved={() => handleSaved(selected.id)}
        />
      )}

      {modal?.type === 'edit' && selected && (
        <IncomeEditModal
          income={selected}
          onClose={backToDetail}
          onSaved={() => handleSaved(selected.id)}
          onDeleted={() => handleSaved(null)}
        />
      )}

      {modal?.type === 'detail' && selected && (
        <IncomeDetailModal
          income={selected}
          accountNames={accountNames}
          onReceive={() => setModal({ type: 'receive', id: selected.id })}
          onEdit={() => setModal({ type: 'edit', id: selected.id })}
          onChanged={reload}
          onClose={closeModal}
        />
      )}
    </div>
  )
}

export default Income