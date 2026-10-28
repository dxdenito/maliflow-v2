import { useState } from 'react'
import { ArrowUpFromLine, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import Modal from './Modal'
import { getErrorMessage } from '../lib/api'
import { formatDate, formatMoney } from '../lib/format'
import {
  daysSinceValued,
  deleteInvestmentEvent,
  formatPercent,
  gainTone,
  isStale,
  signedMoney,
  valuedLabel,
} from '../lib/investments'

const eventTitles = {
  opening: 'Opening balance',
  contribution: 'Money added',
  withdrawal: 'Money withdrawn',
  valuation: 'Value updated',
}

const deleteWarnings = {
  contribution: 'Delete this entry? The money goes back into the account.',
  withdrawal: 'Delete this entry? The money is taken back out of the account.',
}

function Figure({ label, value, tone = '' }) {
  return (
    <div className="rounded-xl bg-app p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-0.5 font-bold ${tone}`}>{value}</p>
    </div>
  )
}

function eventAmount(event) {
  if (event.kind === 'contribution') {
    return `+${formatMoney(event.amount)}`
  }
  if (event.kind === 'withdrawal') {
    return `-${formatMoney(event.amount)}`
  }
  return formatMoney(event.amount)
}

function InvestmentDetailModal({
  investment,
  accountNames,
  onAdd,
  onWithdraw,
  onValue,
  onEdit,
  onChanged,
  onClose,
}) {
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const closed = investment.status === 'closed'
  const stale = isStale(investment)
  const withdrawn = Number(investment.withdrawn)

  async function handleDeleteEvent(event) {
    const warning = deleteWarnings[event.kind] ?? 'Delete this entry?'
    if (!window.confirm(warning)) {
      return
    }
    setError('')
    setBusyId(event.id)
    try {
      await deleteInvestmentEvent(event.id)
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  function eventDetails(event) {
    const parts = [formatDate(event.occurred_on)]

    if (event.account_id) {
      const name = accountNames[event.account_id] ?? 'an account'
      parts.push(event.kind === 'contribution' ? `from ${name}` : `to ${name}`)
    }
    if (event.note) {
      parts.push(event.note)
    }
    return parts.join(' · ')
  }

  return (
    <Modal title={investment.name} onClose={onClose}>
      <div className="space-y-5">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div>
          <p className="text-sm text-muted">
            {closed ? 'Closed' : 'Worth'}
          </p>
          <p className="mt-1 text-4xl font-bold tracking-tight">
            {formatMoney(investment.value)}
          </p>
          <p className={`mt-2 text-sm ${stale ? 'text-warn' : 'text-muted'}`}>
            {valuedLabel(investment)}
            {stale &&
              ` (${daysSinceValued(investment)} days). Update the value to keep your gains accurate.`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Figure label="Net capital" value={formatMoney(investment.net_capital)} />
          <Figure
            label="Unrealized gain"
            value={signedMoney(investment.unrealized_gain)}
            tone={gainTone(investment.unrealized_gain)}
          />
          {withdrawn > 0 && (
            <Figure
              label="Realized gain"
              value={signedMoney(investment.realized_gain)}
              tone={gainTone(investment.realized_gain)}
            />
          )}
          <Figure
            label="Total gain"
            value={signedMoney(investment.total_gain)}
            tone={gainTone(investment.total_gain)}
          />
          <Figure
            label="Return"
            value={formatPercent(investment.return_pct)}
            tone={gainTone(investment.total_gain)}
          />
        </div>

        <p className="text-sm text-muted">
          You have put in {formatMoney(investment.contributed)}
          {withdrawn > 0 && ` and taken out ${formatMoney(withdrawn)}`}.
        </p>

        {investment.note && (
          <p className="text-sm text-muted">{investment.note}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onAdd}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-on-brand transition hover:brightness-110 active:scale-95"
          >
            <Plus size={16} /> Add money
          </button>
          <button
            onClick={onWithdraw}
            disabled={closed}
            className="flex items-center justify-center gap-2 rounded-xl border border-line py-3 text-sm font-medium transition hover:border-brand active:scale-95 disabled:opacity-50"
          >
            <ArrowUpFromLine size={16} /> Withdraw
          </button>
          <button
            onClick={onValue}
            className="flex items-center justify-center gap-2 rounded-xl border border-line py-3 text-sm font-medium transition hover:border-brand active:scale-95"
          >
            <RefreshCw size={16} /> Update value
          </button>
          <button
            onClick={onEdit}
            className="flex items-center justify-center gap-2 rounded-xl border border-line py-3 text-sm font-medium transition hover:border-brand active:scale-95"
          >
            <Pencil size={16} /> Edit
          </button>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">
            History
          </p>
          {investment.events.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing yet. Add money or set its value to get started.
            </p>
          ) : (
            <div className="divide-y divide-line rounded-2xl border border-line">
              {investment.events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      {eventTitles[event.kind]}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {eventDetails(event)}
                    </span>
                  </span>
                  <span
                    className={`font-bold ${
                      event.kind === 'contribution' ? 'text-brand' : ''
                    }`}
                  >
                    {eventAmount(event)}
                  </span>
                  <button
                    onClick={() => handleDeleteEvent(event)}
                    disabled={busyId === event.id}
                    aria-label="Delete entry"
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

export default InvestmentDetailModal