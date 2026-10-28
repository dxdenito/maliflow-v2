import { useCallback, useEffect, useState } from 'react'
import { ChevronRight, HandCoins, Loader2, Plus } from 'lucide-react'
import ObligationDetailModal from '../components/ObligationDetailModal'
import ObligationModal from '../components/ObligationModal'
import PaymentModal from '../components/PaymentModal'
import { fetchAccounts } from '../lib/accounts'
import { getErrorMessage } from '../lib/api'
import { formatMoney } from '../lib/format'
import {
  dueLabel,
  dueTone,
  fetchObligations,
  fetchObligationSummary,
} from '../lib/obligations'

function ObligationRow({ item, onClick }) {
  const paid = Number(item.paid_total)
  const total = Number(item.original_amount)
  const progress = total > 0 ? Math.min(100, (paid / total) * 100) : 0
  const settled = item.status === 'settled'

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-brand/50 active:scale-[0.99] ${
        settled ? 'opacity-70' : ''
      }`}
    >
      <div className="flex items-center gap-4">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            item.status === 'overdue'
              ? 'bg-danger/10 text-danger'
              : 'bg-brand/10 text-brand'
          }`}
        >
          <HandCoins size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{item.name}</span>
          <span className={`block text-sm ${dueTone(item)}`}>
            {dueLabel(item)}
          </span>
        </span>
        <span className="text-right">
          <span className="block font-bold">
            {formatMoney(item.outstanding)}
          </span>
          <span className="block text-xs text-muted">
            of {formatMoney(item.original_amount)}
          </span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-muted" />
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-app">
        <div
          className="h-full rounded-full bg-brand"
          style={{ width: `${progress}%` }}
        />
      </div>
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
          <ObligationRow
            key={item.id}
            item={item}
            onClick={() => onSelect(item)}
          />
        ))}
      </div>
    </section>
  )
}

function Obligations() {
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
        const [list, obligationSummary, accountList] = await Promise.all([
          fetchObligations(),
          fetchObligationSummary(),
          fetchAccounts(true),
        ])
        if (ignore) return
        setItems(list)
        setSummary(obligationSummary)
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
  const active = items.filter((item) => item.status !== 'settled')
  const settled = items.filter((item) => item.status === 'settled')
  const overdueCount = summary?.overdue_count ?? 0

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Obligations</h1>
          <p className="mt-1 text-muted">What you owe, and how it is going</p>
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
            <p className="text-sm text-emerald-200/80">Total still owed</p>
            <p className="mt-2 text-4xl font-bold tracking-tight">
              {formatMoney(summary.total_outstanding)}
            </p>
            {overdueCount > 0 ? (
              <p className="mt-3 text-sm text-red-300">
                {overdueCount} overdue · {formatMoney(summary.overdue_total)}
              </p>
            ) : (
              <p className="mt-3 text-sm text-emerald-200/80">
                {summary.open_count > 0
                  ? `${summary.open_count} open, nothing overdue`
                  : 'Nothing owed right now'}
              </p>
            )}
          </div>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <HandCoins size={26} />
          </div>
          <p className="mt-4 font-semibold">No obligations</p>
          <p className="mt-1 max-w-xs text-sm text-muted">
            Add loans, arrears or anything you owe, and track every repayment
            until it is settled.
          </p>
          <button
            onClick={() => setModal({ type: 'new' })}
            className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition hover:brightness-110"
          >
            Add an obligation
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
            title="Settled"
            items={settled}
            onSelect={(item) => setModal({ type: 'detail', id: item.id })}
          />
        </>
      )}

      {modal?.type === 'new' && (
        <ObligationModal
          obligation={null}
          onClose={closeModal}
          onSaved={() => handleSaved(null)}
          onDeleted={() => handleSaved(null)}
        />
      )}

      {modal?.type === 'edit' && selected && (
        <ObligationModal
          obligation={selected}
          onClose={() => setModal({ type: 'detail', id: selected.id })}
          onSaved={() => handleSaved(selected.id)}
          onDeleted={() => handleSaved(null)}
        />
      )}

      {modal?.type === 'pay' && selected && (
        <PaymentModal
          obligation={selected}
          accounts={accounts}
          onClose={() => setModal({ type: 'detail', id: selected.id })}
          onSaved={() => handleSaved(selected.id)}
        />
      )}

      {modal?.type === 'detail' && selected && (
        <ObligationDetailModal
          obligation={selected}
          accountNames={accountNames}
          onPay={() => setModal({ type: 'pay', id: selected.id })}
          onEdit={() => setModal({ type: 'edit', id: selected.id })}
          onChanged={reload}
          onClose={closeModal}
        />
      )}
    </div>
  )
}

export default Obligations