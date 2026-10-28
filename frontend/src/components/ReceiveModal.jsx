import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import AccountSelect from './AccountSelect'
import Field from './Field'
import Modal from './Modal'
import { defaultAccountId } from '../lib/accounts'
import { getErrorMessage } from '../lib/api'
import { formatDate, formatMoney, isMoneyInput, todayISO } from '../lib/format'
import { deleteIncome, receiveIncome } from '../lib/income'
import { inputClass } from '../lib/styles'

function ReceiveModal({ income, accounts, onClose, onSaved }) {
  const [amount, setAmount] = useState(income.expected_amount)
  const [receivedOn, setReceivedOn] = useState(todayISO())
  const [accountId, setAccountId] = useState(defaultAccountId(accounts))
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

    setSubmitting(true)
    try {
      await receiveIncome(income.id, {
        received_amount: amount,
        received_on: receivedOn,
        account_id: accountId,
      })
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this expected income?')) {
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await deleteIncome(income.id)
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Mark as received" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-2xl bg-app p-4">
          <p className="font-semibold">{income.source}</p>
          <p className="mt-0.5 text-sm text-muted">
            Expected {formatMoney(income.expected_amount)} on{' '}
            {formatDate(income.expected_on)}
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {accounts.length === 0 ? (
          <p className="text-sm text-muted">
            Add an account first so there is somewhere for the money to land.
          </p>
        ) : (
          <>
            <Field
              id="receive-amount"
              label="Amount received"
              hint="Change it if you were paid more or less than expected."
            >
              <input
                id="receive-amount"
                value={amount}
                onChange={handleAmountChange}
                inputMode="decimal"
                required
                className={inputClass}
              />
            </Field>

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

            <AccountSelect
              id="receive-account"
              label="Into account"
              accounts={accounts}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            />

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-brand transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
            >
              {submitting && <Loader2 size={18} className="animate-spin" />}
              Mark as received
            </button>
          </>
        )}

        <button
          type="button"
          onClick={handleDelete}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-3 font-medium text-muted transition hover:border-danger hover:text-danger disabled:opacity-60"
        >
          <Trash2 size={16} /> Delete expected income
        </button>
      </form>
    </Modal>
  )
}

export default ReceiveModal