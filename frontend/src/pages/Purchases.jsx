import { useCallback, useEffect, useState } from 'react'
import { ChevronRight, Loader2, Plus, ShoppingBag } from 'lucide-react'
import PurchaseDetailModal from '../components/PurchaseDetailModal'
import PurchaseEditModal from '../components/PurchaseEditModal'
import PurchaseModal from '../components/PurchaseModal'
import PurchasePaymentModal from '../components/PurchasePaymentModal'
import { fetchAccounts } from '../lib/accounts'
import { getErrorMessage } from '../lib/api'
import { formatMoney } from '../lib/format'
import {
  fetchPurchases,
  fetchPurchaseSummary,
  purchaseSubtitle,
  purchaseTone,
} from '../lib/purchases'

function PurchaseRow({ item, onClick }) {
  const paid = Number(item.paid_total)
  const payable = Number(item.total_payable)
  const progress = payable > 0 ? Math.min(100, (paid / payable) * 100) : 0
  const isPaid = item.status === 'paid'
  const showProgress = item.kind === 'financed' && !isPaid

  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-brand/50 active:scale-[0.99]"
    >
      <div className="flex items-center gap-4">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            item.status === 'overdue'
              ? 'bg-danger/10 text-danger'
              : 'bg-brand/10 text-brand'
          }`}
        >
          <ShoppingBag size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{item.name}</span>
          <span className={`block text-sm ${purchaseTone(item)}`}>
            {purchaseSubtitle(item)}
          </span>
        </span>
        <span className="text-right">
          <span className="block font-bold">
            {formatMoney(isPaid ? item.price : item.outstanding)}
          </span>
          <span className="block text-xs text-muted">
            {isPaid
              ? item.kind === 'cash'
                ? 'Cash'
                : 'Financed'
              : `of ${formatMoney(item.total_payable)}`}
          </span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-muted" />
      </div>
      {showProgress && (
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
          <PurchaseRow
            key={item.id}
            item={item}
            onClick={() => onSelect(item)}
          />
        ))}
      </div>
    </section>
  )
}

function Purchases() {
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
        const [list, purchaseSummary, accountList] = await Promise.all([
          fetchPurchases(),
          fetchPurchaseSummary(),
          fetchAccounts(true),
        ])
        if (ignore) return
        setItems(list)
        setSummary(purchaseSummary)
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
  const active = items.filter((item) => item.status !== 'paid')
  const history = items.filter((item) => item.status === 'paid')
  const overdueCount = summary?.overdue_count ?? 0

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchases</h1>
          <p className="mt-1 text-muted">Big buys, paid in cash or over time</p>
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
            <p className="text-sm text-emerald-200/80">Still owed on purchases</p>
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
                  ? `${summary.open_count} being paid off, nothing overdue`
                  : 'Nothing owed on purchases'}
              </p>
            )}
          </div>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <ShoppingBag size={26} />
          </div>
          <p className="mt-4 font-semibold">No purchases yet</p>
          <p className="mt-1 max-w-xs text-sm text-muted">
            Record big buys paid in cash, or financed ones with a deposit and
            repayments over time.
          </p>
          <button
            onClick={() => setModal({ type: 'new' })}
            className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition hover:brightness-110"
          >
            Add a purchase
          </button>
        </div>
      )}

      {!loading && (
        <>
          <Group
            title="Being paid off"
            items={active}
            onSelect={(item) => setModal({ type: 'detail', id: item.id })}
          />
          <Group
            title="History"
            items={history}
            onSelect={(item) => setModal({ type: 'detail', id: item.id })}
          />
        </>
      )}

      {modal?.type === 'new' && (
        <PurchaseModal
          accounts={accounts}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}

      {modal?.type === 'edit' && selected && (
        <PurchaseEditModal
          purchase={selected}
          onClose={() => setModal({ type: 'detail', id: selected.id })}
          onSaved={() => handleSaved(selected.id)}
          onDeleted={() => handleSaved(null)}
        />
      )}

      {modal?.type === 'pay' && selected && (
        <PurchasePaymentModal
          purchase={selected}
          accounts={accounts}
          onClose={() => setModal({ type: 'detail', id: selected.id })}
          onSaved={() => handleSaved(selected.id)}
        />
      )}

      {modal?.type === 'detail' && selected && (
        <PurchaseDetailModal
          purchase={selected}
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

export default Purchases