import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import AccountSelect from './AccountSelect'
import Field from './Field'
import Modal from './Modal'
import { defaultAccountId } from '../lib/accounts'
import { getErrorMessage } from '../lib/api'
import { formatMoney, isMoneyInput, todayISO } from '../lib/format'
import { addContribution, addWithdrawal } from '../lib/investments'
import { inputClass } from '../lib/styles'

function cents(value) {
  return Math.round(Number(value || 0) * 100)
}

function splitWithdrawal(amount, worth, capital) {
  if (!(amount > 0) || !(worth > 0) || amount > worth) {
    return null
  }

  const profit = worth - capital

  if (profit > 0) {
    const fromProfit = Math.min(amount, profit)
    return { fromProfit, fromCapital: amount - fromProfit, loss: 0 }
  }

  const capitalPart = capital * (amount / worth)
  return { fromProfit: 0, fromCapital: amount, loss: capitalPart - amount }
}

function splitMessage(split) {
  if (split.loss > 0.005) {
    return `Because it is worth less than you put in, this realizes a loss of ${formatMoney(split.loss)}.`
  }
  if (split.fromCapital === 0) {
    return 'All of this comes out of your profit.'
  }
  if (split.fromProfit === 0) {
    return 'This comes out of your capital.'
  }
  return `${formatMoney(split.fromProfit)} of this is profit and ${formatMoney(split.fromCapital)} is your capital.`
}

function MoneyMoveModal({ mode, investment, accounts, onClose, onSaved }) {
  const isAdd = mode === 'contribute'
  const usable = accounts
    .filter((account) => account.is_active)
    .map((account) => ({
      ...account,
      name: `${account.name} · ${formatMoney(account.balance)}`,
    }))

  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState(defaultAccountId(usable))
  const [occurredOn, setOccurredOn] = useState(todayISO())
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const worth = Number(investment.value)
  const capital = Number(investment.net_capital)
  const split = isAdd ? null : splitWithdrawal(Number(amount), worth, capital)

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

    if (isAdd) {
      const account = usable.find((item) => item.id === accountId)
      if (account && amountCents > cents(account.balance)) {
        setError('That is more than the account holds')
        return
      }
    } else if (amountCents > cents(worth)) {
      setError(
        `That is more than the investment is worth (${formatMoney(worth)}). Update its value first.`,
      )
      return
    }

    const payload = {
      account_id: accountId,
      amount: (amountCents / 100).toFixed(2),
      occurred_on: occurredOn,
      note: note.trim() || null,
    }

    setSubmitting(true)
    try {
      if (isAdd) {
        await addContribution(investment.id, payload)
      } else {
        await addWithdrawal(investment.id, payload)
      }
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <Modal title={isAdd ? 'Add money' : 'Withdraw'} onClose={onClose}>
      {usable.length === 0 ? (
        <p className="text-sm text-muted">
          Add an account first, so there is somewhere for the money to{' '}
          {isAdd ? 'come from' : 'go'}. You can do that on the{' '}
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
            <p className="mt-3 text-center text-sm text-muted">
              {investment.name} is worth {formatMoney(worth)}
            </p>

            {!isAdd && worth > 0 && (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => setAmount(worth.toFixed(2))}
                  className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-brand transition hover:border-brand"
                >
                  Withdraw everything
                </button>
              </div>
            )}

            {split && (
              <p className="mt-3 text-center text-xs text-muted">
                {splitMessage(split)}
              </p>
            )}
          </div>

          <AccountSelect
            id="move-account"
            label={isAdd ? 'Take the money from' : 'Put the money into'}
            accounts={usable}
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          />

          <Field id="move-date" label="Date">
            <input
              id="move-date"
              type="date"
              max={todayISO()}
              value={occurredOn}
              onChange={(e) => setOccurredOn(e.target.value)}
              required
              className={inputClass}
            />
          </Field>

          <Field id="move-note" label="Note (optional)">
            <input
              id="move-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
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
            {isAdd ? 'Add money' : 'Withdraw'}
          </button>
        </form>
      )}
    </Modal>
  )
}

export default MoneyMoveModal