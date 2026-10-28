import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import AccountSelect from './AccountSelect'
import Field from './Field'
import Modal from './Modal'
import { defaultAccountId } from '../lib/accounts'
import { getErrorMessage } from '../lib/api'
import { formatMoney, isMoneyInput, todayISO } from '../lib/format'
import { createAdjustment } from '../lib/ledger'
import { inputClass } from '../lib/styles'

function cents(value) {
  return Math.round(Number(value || 0) * 100)
}

function AdjustmentModal({ accounts, onClose, onSaved }) {
  const usable = accounts.filter((account) => account.is_active)

  const [accountId, setAccountId] = useState(defaultAccountId(usable))
  const [balance, setBalance] = useState('')
  const [occurredOn, setOccurredOn] = useState(todayISO())
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const account = usable.find((item) => item.id === accountId)
  const differenceCents =
    account && balance !== '' ? cents(balance) - cents(account.balance) : 0

  function handleBalanceChange(event) {
    if (isMoneyInput(event.target.value)) {
      setBalance(event.target.value)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (balance === '') {
      setError("Enter the account's real balance")
      return
    }
    if (differenceCents === 0) {
      setError('The account already has that balance')
      return
    }

    setSubmitting(true)
    try {
      await createAdjustment({
        account_id: accountId,
        new_balance: (cents(balance) / 100).toFixed(2),
        occurred_on: occurredOn,
        note: note.trim() || null,
      })
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Adjust a balance" onClose={onClose}>
      {usable.length === 0 ? (
        <p className="text-sm text-muted">
          Add an account first on the{' '}
          <Link to="/accounts" className="font-semibold text-brand">
            Accounts page
          </Link>
          .
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <p className="text-sm text-muted">
            Use this when an account's real balance doesn't match MaliFlow. Only
            the difference is recorded, and it isn't counted as income or
            spending.
          </p>

          {error && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <AccountSelect
            id="adjust-account"
            label="Account"
            accounts={usable.map((item) => ({
              ...item,
              name: `${item.name} · ${formatMoney(item.balance)}`,
            }))}
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          />

          <div className="rounded-2xl bg-app px-4 py-6">
            <input
              aria-label="Real balance"
              value={balance}
              onChange={handleBalanceChange}
              inputMode="decimal"
              placeholder={account ? String(account.balance) : '0.00'}
              autoFocus
              className="w-full bg-transparent text-center text-5xl font-bold tracking-tight text-ink outline-none placeholder:text-muted/40"
            />
            <p className="mt-3 text-center text-sm text-muted">
              What the account really holds
            </p>
            {balance !== '' && differenceCents !== 0 && (
              <p
                className={`mt-2 text-center text-sm font-semibold ${
                  differenceCents > 0 ? 'text-brand' : 'text-danger'
                }`}
              >
                This records a correction of{' '}
                {differenceCents > 0 ? '+' : '-'}
                {formatMoney(Math.abs(differenceCents) / 100)}
              </p>
            )}
          </div>

          <Field id="adjust-date" label="Date">
            <input
              id="adjust-date"
              type="date"
              max={todayISO()}
              value={occurredOn}
              onChange={(e) => setOccurredOn(e.target.value)}
              required
              className={inputClass}
            />
          </Field>

          <Field id="adjust-note" label="Note (optional)">
            <input
              id="adjust-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Forgot to log a few small expenses"
              maxLength={255}
              className={inputClass}
            />
          </Field>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-brand transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
          >
            {submitting && <Loader2 size={18} className="animate-spin" />}
            Save adjustment
          </button>
        </form>
      )}
    </Modal>
  )
}

export default AdjustmentModal