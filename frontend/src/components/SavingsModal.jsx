import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import AccountSelect from './AccountSelect'
import Field from './Field'
import Modal from './Modal'
import { getErrorMessage } from '../lib/api'
import { formatMoney, isMoneyInput, todayISO } from '../lib/format'
import { depositToSavings, withdrawFromSavings } from '../lib/savings'
import { inputClass } from '../lib/styles'

function withBalance(accounts) {
  return accounts.map((account) => ({
    ...account,
    name: `${account.name} · ${formatMoney(account.balance)}`,
  }))
}

function SavingsModal({ mode, accounts, onClose, onSaved }) {
  const isDeposit = mode === 'deposit'
  const sourcePool = isDeposit ? 'available' : 'savings'
  const targetPool = isDeposit ? 'savings' : 'available'

  const sources = accounts.filter(
    (account) => account.is_active && account.pool === sourcePool,
  )
  const targets = accounts.filter(
    (account) => account.is_active && account.pool === targetPool,
  )

  const [amount, setAmount] = useState('')
  const [fromId, setFromId] = useState(sources[0]?.id ?? '')
  const [toId, setToId] = useState(targets[0]?.id ?? '')
  const [occurredOn, setOccurredOn] = useState(todayISO())
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleAmountChange(event) {
    if (isMoneyInput(event.target.value)) {
      setAmount(event.target.value)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!(Number(amount) > 0)) {
      setError('Enter an amount greater than zero')
      return
    }

    const source = sources.find((account) => account.id === fromId)
    if (source && Number(amount) > Number(source.balance)) {
      setError('That is more than the account holds')
      return
    }

    const payload = {
      from_account_id: fromId,
      to_account_id: toId,
      amount,
      occurred_on: occurredOn,
      note: note.trim() || null,
    }

    setSubmitting(true)
    try {
      if (isDeposit) {
        await depositToSavings(payload)
      } else {
        await withdrawFromSavings(payload)
      }
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  const missingAccounts = sources.length === 0 || targets.length === 0

  return (
    <Modal title={isDeposit ? 'Save money' : 'Withdraw savings'} onClose={onClose}>
      {missingAccounts ? (
        <p className="text-sm text-muted">
          You need at least one {sourcePool} account and one {targetPool}{' '}
          account first. You can add them on the{' '}
          <Link to="/accounts" className="font-semibold text-brand">
            Accounts page
          </Link>
          .
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="rounded-2xl bg-app py-6">
            <input
              aria-label="Amount"
              value={amount}
              onChange={handleAmountChange}
              inputMode="decimal"
              placeholder="0.00"
              autoFocus
              required
              className="w-full bg-transparent text-center text-5xl font-bold tracking-tight text-ink outline-none placeholder:text-muted/40"
            />
          </div>

          <AccountSelect
            id="savings-from"
            label="From"
            accounts={withBalance(sources)}
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
          />

          <AccountSelect
            id="savings-to"
            label="To"
            accounts={withBalance(targets)}
            value={toId}
            onChange={(e) => setToId(e.target.value)}
          />

          <Field id="savings-date" label="Date">
            <input
              id="savings-date"
              type="date"
              max={todayISO()}
              value={occurredOn}
              onChange={(e) => setOccurredOn(e.target.value)}
              required
              className={inputClass}
            />
          </Field>

          <Field id="savings-note" label="Note (optional)">
            <input
              id="savings-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Month-end savings"
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
            {isDeposit ? 'Save money' : 'Withdraw'}
          </button>
        </form>
      )}
    </Modal>
  )
}

export default SavingsModal