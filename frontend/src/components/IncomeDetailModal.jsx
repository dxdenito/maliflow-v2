import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import Modal from './Modal'
import { getErrorMessage } from '../lib/api'
import { formatDate, formatMoney, formatMonth } from '../lib/format'
import { deleteReceipt, updateIncome } from '../lib/income'

function Figure({ label, value, tone = '' }) {
  return (
    <div className="rounded-xl bg-app p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-0.5 font-bold ${tone}`}>{value}</p>
    </div>
  )
}

function IncomeDetailModal({
  income,
  accountNames,
  onReceive,
  onEdit,
  onChanged,
  onClose,
}) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const expected = Number(income.expected_amount)
  const received = Number(income.received_total)
  const remaining = Number(income.remaining)
  const done = income.status === 'received'
  const shortfall = income.closed && received < expected ? expected - received : 0
  const progress = expected > 0 ? Math.min(100, (received / expected) * 100) : 0

  let statusText = `Expected ${formatDate(income.expected_on)}`
  if (income.status === 'partial') {
    statusText = 'Partly received'
  } else if (done) {
    statusText =
      shortfall > 0
        ? `Closed, ${formatMoney(shortfall)} less than expected`
        : 'Fully received'
  }

  async function run(action) {
    setError('')
    setBusy(true)
    try {
      await action()
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function handleDeleteReceipt(receipt) {
    if (
      !window.confirm(
        'Delete this payment? The money is taken back out of the account.',
      )
    ) {
      return
    }
    run(() => deleteReceipt(receipt.id))
  }

  function handleCloseOut() {
    if (
      !window.confirm(
        `Close this out? The remaining ${formatMoney(remaining)} will no longer be expected.`,
      )
    ) {
      return
    }
    run(() => updateIncome(income.id, { closed: true }))
  }

  function handleReopen() {
    run(() => updateIncome(income.id, { closed: false }))
  }

  return (
    <Modal title={income.source} onClose={onClose}>
      <div className="space-y-5">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className={`font-medium ${done ? 'text-brand' : 'text-muted'}`}>
              {statusText}
            </span>
            <span className="shrink-0 text-muted">
              Counts toward {formatMonth(income.period.slice(0, 7))}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-app">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Figure label="Expected" value={formatMoney(expected)} />
          <Figure label="Received" value={formatMoney(received)} tone="text-brand" />
          <Figure
            label={done ? 'Short by' : 'To come'}
            value={formatMoney(done ? shortfall : remaining)}
          />
        </div>

        {income.note && <p className="text-sm text-muted">{income.note}</p>}

        <div className="grid grid-cols-2 gap-3">
          {!done ? (
            <button
              onClick={onReceive}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-on-brand transition hover:brightness-110 active:scale-95"
            >
              <Plus size={16} /> Receive money
            </button>
          ) : (
            <div className="flex items-center justify-center rounded-xl bg-brand/10 py-3 text-sm font-semibold text-brand">
              {shortfall > 0 ? 'Closed' : 'Fully received'}
            </div>
          )}
          <button
            onClick={onEdit}
            className="flex items-center justify-center gap-2 rounded-xl border border-line py-3 text-sm font-medium transition hover:border-brand active:scale-95"
          >
            <Pencil size={16} /> Edit
          </button>
        </div>

        {income.status === 'partial' && (
          <button
            onClick={handleCloseOut}
            disabled={busy}
            className="w-full text-center text-sm font-semibold text-muted transition hover:text-ink disabled:opacity-60"
          >
            I won't get the rest
          </button>
        )}

        {shortfall > 0 && (
          <button
            onClick={handleReopen}
            disabled={busy}
            className="w-full text-center text-sm font-semibold text-brand disabled:opacity-60"
          >
            Expect the rest again
          </button>
        )}

        <div>
          <p className="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">
            Payments
          </p>
          {income.receipts.length === 0 ? (
            <p className="text-sm text-muted">Nothing received yet.</p>
          ) : (
            <div className="divide-y divide-line rounded-2xl border border-line">
              {income.receipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      {formatDate(receipt.received_on)}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {accountNames[receipt.account_id] ?? 'an account'}
                      {receipt.note ? ` · ${receipt.note}` : ''}
                    </span>
                  </span>
                  <span className="font-bold text-brand">
                    +{formatMoney(receipt.amount)}
                  </span>
                  <button
                    onClick={() => handleDeleteReceipt(receipt)}
                    disabled={busy}
                    aria-label="Delete payment"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:text-danger disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default IncomeDetailModal