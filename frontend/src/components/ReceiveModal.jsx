import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import AccountSelect from './AccountSelect'
import Field from './Field'
import Modal from './Modal'
import { defaultAccountId } from '../lib/accounts'
import { getErrorMessage } from '../lib/api'
import { formatDate, formatMoney, isMoneyInput, todayISO } from '../lib/format'
import { receiveIncome } from '../lib/income'
import { inputClass } from '../lib/styles'

function cents(value) {
  return Math.round(Number(value || 0) * 100)
}

function ReceiveModal({ income, accounts, onClose, onSaved }) {
  const usable = accounts.filter((account) => account.is_active)
  const remaining = Number(income.remaining)
  const received = Number(income.received_total)

  const [amount, setAmount] = useState(remaining > 0 ? remaining.toFixed(2) : '')
  const [receivedOn, setReceivedOn] = useState(todayISO())
  const [accountId, setAccountId] = useState(defaultAccountId(usable))
  const [note, setNote] = useState('')
  const [last, setLast] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const partial = cents(amount) > 0 && cents(amount) < cents(remaining)

  function handleAmountChange(event) {
    if (isMoneyInput(event.target.value)) {
      setAmount(event.target.value)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (cents(amount) <= 0) {
      setError('Enter an amount greater than zero')
      return
    }

    setSubmitting(true)
    try {
      await receiveIncome(income.id, {
        amount: (cents(amount) / 100).toFixed(2),
        received_on: receivedOn,
        account_id: accountId,
        note: note.trim() || null,
        close: partial && last,
      })
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Receive money" onClose={onClose}>
      {usable.length === 0 ? (
        <p className="text-sm text-muted">
          Add an account first, so there is somewhere for the money to land. You
          can do that on the{' '}
          <Link to="/accounts" className="font-semibold text-brand">
            Accounts page
          </Link>
          .
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-2xl bg-app p-4">
            <p className="font-semibold">{income.source}</p>
            <p className="mt-0.5 text-sm text-muted">
              Expected {formatMoney(income.expected_amount)} on{' '}
              {formatDate(income.expected_on)}
            </p>
            {received > 0 && (
              <p className="mt-1 text-sm text-muted">
                Received so far {formatMoney(received)} · {formatMoney(remaining)}{' '}
                still to come
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="rounded-2xl bg-app px-4 py-6">
            <input
              aria-label="Amount received"
              value={amount}
              onChange={handleAmountChange}
              inputMode="decimal"
              placeholder="0.00"
              autoFocus
              required
              className="w-full bg-transparent text-center text-5xl font-bold tracking-tight text-ink outline-none placeholder:text-muted/40"
            />
            <p className="mt-3 text-center text-sm text-muted">
              Enter what you received in this payment
            </p>
            {remaining > 0 && (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => setAmount(remaining.toFixed(2))}
                  className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-brand transition hover:border-brand"
                >
                  Everything left · {formatMoney(remaining)}
                </button>
              </div>
            )}
          </div>

          <AccountSelect
            id="receive-account"
            label="Into account"
            accounts={usable}
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          />

          <Field id="receive-date" label="Received on">
            <input
              id="receive-date"
              type="date"
              max={todayISO()}
              value={receivedOn}
              onChange={(e) => setReceivedOn(e.target.value)}
              required
              className={inputClass}
            />
          </Field>

          <Field id="receive-note" label="Note (optional)">
            <input
              id="receive-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. First half"
              maxLength={255}
              className={inputClass}
            />
          </Field>

          {partial && (
            <button
              type="button"
              role="switch"
              aria-checked={last}
              onClick={() => setLast(!last)}
              className="flex w-full items-center justify-between rounded-xl border border-line px-4 py-3 text-left"
            >
              <span>
                <span className="block font-medium">This is the last payment</span>
                <span className="block text-xs text-muted">
                  I don't expect the other{' '}
                  {formatMoney((cents(remaining) - cents(amount)) / 100)}
                </span>
              </span>
              <span
                className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${
                  last ? 'bg-brand' : 'bg-line'
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full bg-white shadow transition ${
                    last ? 'translate-x-5' : ''
                  }`}
                />
              </span>
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-brand transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
          >
            {submitting && <Loader2 size={18} className="animate-spin" />}
            Save payment
          </button>
        </form>
      )}
    </Modal>
  )
}

export default ReceiveModal