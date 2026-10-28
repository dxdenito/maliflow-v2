import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import AccountSelect from './AccountSelect'
import Field from './Field'
import Modal from './Modal'
import { getErrorMessage } from '../lib/api'
import { formatMoney, isMoneyInput, todayISO } from '../lib/format'
import { createTransfer } from '../lib/ledger'
import { inputClass } from '../lib/styles'

function cents(value) {
  return Math.round(Number(value || 0) * 100)
}

function hasPartner(account, accounts) {
  return accounts.some(
    (other) => other.id !== account.id && other.pool === account.pool,
  )
}

function withBalance(accounts) {
  return accounts.map((account) => ({
    ...account,
    name: `${account.name} · ${formatMoney(account.balance)}`,
  }))
}

function TransferModal({ accounts, onClose, onSaved }) {
  const usable = accounts.filter((account) => account.is_active)
  const sources = usable.filter((account) => hasPartner(account, usable))
  const first = sources[0]

  const [fromId, setFromId] = useState(first?.id ?? '')
  const [toId, setToId] = useState(
    () =>
      usable.find(
        (account) =>
          first && account.id !== first.id && account.pool === first.pool,
      )?.id ?? '',
  )
  const [amount, setAmount] = useState('')
  const [occurredOn, setOccurredOn] = useState(todayISO())
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const source = usable.find((account) => account.id === fromId)
  const targets = usable.filter(
    (account) => account.id !== fromId && account.pool === source?.pool,
  )

  function handleFromChange(event) {
    const id = event.target.value
    const next = usable.find((account) => account.id === id)
    const nextTargets = usable.filter(
      (account) => account.id !== id && account.pool === next?.pool,
    )
    setFromId(id)
    setToId(nextTargets[0]?.id ?? '')
  }

  function handleAmountChange(event) {
    if (isMoneyInput(event.target.value)) {
      setAmount(event.target.value)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const amountCents = cents(amount)
    if (amountCents <= 0) {
      setError('Enter an amount greater than zero')
      return
    }
    if (source && amountCents > cents(source.balance)) {
      setError('That is more than the account holds')
      return
    }

    setSubmitting(true)
    try {
      await createTransfer({
        from_account_id: fromId,
        to_account_id: toId,
        amount: (amountCents / 100).toFixed(2),
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
    <Modal title="Move money" onClose={onClose}>
      {!first ? (
        <p className="text-sm text-muted">
          You need two accounts in the same pool to move money between them. You
          can add one on the{' '}
          <Link to="/accounts" className="font-semibold text-brand">
            Accounts page
          </Link>
          . To move money between Available and Savings, use the Savings page.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="rounded-2xl bg-app px-4 py-6">
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
            id="transfer-from"
            label="From"
            accounts={withBalance(sources)}
            value={fromId}
            onChange={handleFromChange}
          />

          <AccountSelect
            id="transfer-to"
            label="To"
            accounts={withBalance(targets)}
            value={toId}
            onChange={(e) => setToId(e.target.value)}
          />

          <Field id="transfer-date" label="Date">
            <input
              id="transfer-date"
              type="date"
              max={todayISO()}
              value={occurredOn}
              onChange={(e) => setOccurredOn(e.target.value)}
              required
              className={inputClass}
            />
          </Field>

          <Field id="transfer-note" label="Note (optional)">
            <input
              id="transfer-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Topped up the mobile wallet"
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
            Move money
          </button>
        </form>
      )}
    </Modal>
  )
}

export default TransferModal