import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import AccountSelect from './AccountSelect'
import Field from './Field'
import Modal from './Modal'
import { defaultAccountId } from '../lib/accounts'
import { getErrorMessage } from '../lib/api'
import { formatMoney, isMoneyInput, todayISO } from '../lib/format'
import { addPayment } from '../lib/obligations'
import { inputClass } from '../lib/styles'

function PaymentModal({ obligation, accounts, onClose, onSaved }) {
  const usable = accounts
    .filter((account) => account.is_active)
    .map((account) => ({
      ...account,
      name: `${account.name} · ${formatMoney(account.balance)}`,
    }))

  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState(defaultAccountId(usable))
  const [paidOn, setPaidOn] = useState(todayISO())
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const outstanding = Number(obligation.outstanding)
  const plan = obligation.plan
  const dueNow = Number(plan?.due_now ?? 0)
  const nextAmount = Number(plan?.next_due_amount ?? 0)

  const shortcuts = []
  if (plan && dueNow > 0) {
    shortcuts.push({ label: `Due now · ${formatMoney(dueNow)}`, value: dueNow })
  } else if (plan && nextAmount > 0) {
    shortcuts.push({
      label: `Next installment · ${formatMoney(nextAmount)}`,
      value: nextAmount,
    })
  }
  if (!shortcuts.some((item) => item.value === outstanding)) {
    shortcuts.push({ label: 'Pay in full', value: outstanding })
  }

  function handleAmountChange(event) {
    if (isMoneyInput(event.target.value)) {
      setAmount(event.target.value)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const value = Number(amount)
    if (!(value > 0)) {
      setError('Enter an amount greater than zero')
      return
    }
    if (value > outstanding) {
      setError(`That is more than what is still owed (${formatMoney(outstanding)})`)
      return
    }

    const account = usable.find((item) => item.id === accountId)
    if (account && value > Number(account.balance)) {
      setError('That is more than the account holds')
      return
    }

    setSubmitting(true)
    try {
      await addPayment(obligation.id, {
        account_id: accountId,
        amount: value.toFixed(2),
        paid_on: paidOn,
        note: note.trim() || null,
      })
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <Modal title={`Pay ${obligation.name}`} onClose={onClose}>
      {usable.length === 0 ? (
        <p className="text-sm text-muted">
          Add an account first, so there is somewhere to pay from. You can do
          that on the{' '}
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
              Still owed {formatMoney(outstanding)}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {shortcuts.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setAmount(item.value.toFixed(2))}
                  className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-brand transition hover:border-brand"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <AccountSelect
            id="payment-account"
            label="Pay from"
            accounts={usable}
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          />

          <Field id="payment-date" label="Date">
            <input
              id="payment-date"
              type="date"
              max={todayISO()}
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
              required
              className={inputClass}
            />
          </Field>

          <Field id="payment-note" label="Note (optional)">
            <input
              id="payment-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. October instalment"
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
            Make payment
          </button>
        </form>
      )}
    </Modal>
  )
}

export default PaymentModal