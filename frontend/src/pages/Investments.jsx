import { useCallback, useEffect, useState } from 'react'
import { ChevronRight, Loader2, Plus, TrendingUp } from 'lucide-react'
import InvestmentDetailModal from '../components/InvestmentDetailModal'
import InvestmentEditModal from '../components/InvestmentEditModal'
import InvestmentModal from '../components/InvestmentModal'
import MoneyMoveModal from '../components/MoneyMoveModal'
import ValuationModal from '../components/ValuationModal'
import { investmentTypeMap } from '../config/investmentTypes'
import { fetchAccounts } from '../lib/accounts'
import { getErrorMessage } from '../lib/api'
import { formatMoney } from '../lib/format'
import {
  fetchInvestments,
  fetchInvestmentSummary,
  formatPercent,
  gainTone,
  isStale,
  signedMoney,
  valuedLabel,
} from '../lib/investments'

function heroTone(value) {
  const number = Number(value)

  if (number > 0) {
    return 'text-emerald-300'
  }
  if (number < 0) {
    return 'text-red-300'
  }
  return 'text-emerald-200/80'
}

function InvestmentRow({ item, onClick }) {
  const type = investmentTypeMap[item.investment_type] ?? investmentTypeMap.other
  const closed = item.status === 'closed'

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-brand/50 active:scale-[0.99] ${
        closed ? 'opacity-70' : ''
      }`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <type.icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{item.name}</span>
        <span
          className={`block truncate text-sm ${
            isStale(item) ? 'text-warn' : 'text-muted'
          }`}
        >
          {closed ? 'Closed' : `${type.label} · ${valuedLabel(item)}`}
        </span>
      </span>
      <span className="text-right">
        <span className="block font-bold">
          {closed ? signedMoney(item.realized_gain) : formatMoney(item.value)}
        </span>
        <span className={`block text-xs ${gainTone(item.total_gain)}`}>
          {closed
            ? 'realized'
            : `${signedMoney(item.total_gain)} (${formatPercent(item.return_pct)})`}
        </span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-muted" />
    </button>
  )
}

function Group({ title, items, onSelect }) {
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
          <InvestmentRow
            key={item.id}
            item={item}
            onClick={() => onSelect(item)}
          />
        ))}
      </div>
    </section>
  )
}

function Investments() {
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
        const [list, investmentSummary, accountList] = await Promise.all([
          fetchInvestments(),
          fetchInvestmentSummary(),
          fetchAccounts(true),
        ])
        if (ignore) return
        setItems(list)
        setSummary(investmentSummary)
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
  }, [version])

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
  const active = items.filter((item) => item.status === 'active')
  const closed = items.filter((item) => item.status === 'closed')

  function backToDetail() {
    setModal({ type: 'detail', id: selected.id })
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Investments</h1>
          <p className="mt-1 text-muted">Stocks, funds and businesses</p>
        </div>
        <button
          onClick={() => setModal({ type: 'new' })}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand transition hover:brightness-110 active:scale-95"
        >
          <Plus size={16} /> Add
        </button>
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
            <p className="text-sm text-emerald-200/80">Total value</p>
            <p className="mt-2 text-4xl font-bold tracking-tight">
              {formatMoney(summary.total_value)}
            </p>
            <p className={`mt-3 text-sm ${heroTone(summary.total_gain)}`}>
              Total gain {signedMoney(summary.total_gain)} (
              {formatPercent(summary.return_pct)})
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-xs text-emerald-200/70">Net capital</p>
                <p className="mt-0.5 text-sm font-semibold">
                  {formatMoney(summary.net_capital)}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-xs text-emerald-200/70">Unrealized</p>
                <p className="mt-0.5 text-sm font-semibold">
                  {signedMoney(summary.unrealized_gain)}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-xs text-emerald-200/70">Realized</p>
                <p className="mt-0.5 text-sm font-semibold">
                  {signedMoney(summary.realized_gain)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <TrendingUp size={26} />
          </div>
          <p className="mt-4 font-semibold">No investments yet</p>
          <p className="mt-1 max-w-xs text-sm text-muted">
            Track stocks, money market funds or a business, and see your capital
            and your gains separately.
          </p>
          <button
            onClick={() => setModal({ type: 'new' })}
            className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition hover:brightness-110"
          >
            Add an investment
          </button>
        </div>
      )}

      {!loading && (
        <>
          <Group
            title="Active"
            items={active}
            onSelect={(item) => setModal({ type: 'detail', id: item.id })}
          />
          <Group
            title="Closed"
            items={closed}
            onSelect={(item) => setModal({ type: 'detail', id: item.id })}
          />
        </>
      )}

      {modal?.type === 'new' && (
        <InvestmentModal onClose={closeModal} onSaved={handleSaved} />
      )}

      {modal?.type === 'contribute' && selected && (
        <MoneyMoveModal
          mode="contribute"
          investment={selected}
          accounts={accounts}
          onClose={backToDetail}
          onSaved={() => handleSaved(selected.id)}
        />
      )}

      {modal?.type === 'withdraw' && selected && (
        <MoneyMoveModal
          mode="withdraw"
          investment={selected}
          accounts={accounts}
          onClose={backToDetail}
          onSaved={() => handleSaved(selected.id)}
        />
      )}

      {modal?.type === 'value' && selected && (
        <ValuationModal
          investment={selected}
          onClose={backToDetail}
          onSaved={() => handleSaved(selected.id)}
        />
      )}

      {modal?.type === 'edit' && selected && (
        <InvestmentEditModal
          investment={selected}
          onClose={backToDetail}
          onSaved={() => handleSaved(selected.id)}
          onDeleted={() => handleSaved(null)}
        />
      )}

      {modal?.type === 'detail' && selected && (
        <InvestmentDetailModal
          investment={selected}
          accountNames={accountNames}
          onAdd={() => setModal({ type: 'contribute', id: selected.id })}
          onWithdraw={() => setModal({ type: 'withdraw', id: selected.id })}
          onValue={() => setModal({ type: 'value', id: selected.id })}
          onEdit={() => setModal({ type: 'edit', id: selected.id })}
          onChanged={reload}
          onClose={closeModal}
        />
      )}
    </div>
  )
}

export default Investments