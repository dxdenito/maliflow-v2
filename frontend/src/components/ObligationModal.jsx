import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import Choice from './Choice'
import Field from './Field'
import Modal from './Modal'
import { getErrorMessage } from '../lib/api'
import { formatMoney, isMoneyInput, todayISO } from '../lib/format'
import {
  createObligation,
  deleteObligation,
  updateObligation,
} from '../lib/obligations'
import { inputClass } from '../lib/styles'

const frequencies = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

function cents(value) {
  return Math.round(Number(value || 0) * 100)
}

function describePlan(total, installment) {
  const totalCents = cents(total)
  const installmentCents = cents(installment)

  if (
    totalCents <= 0 ||
    installmentCents <= 0 ||
    installmentCents > totalCents
  ) {
    return null
  }

  const count = Math.ceil(totalCents / installmentCents)
  const lastCents = totalCents - (count - 1) * installmentCents

  if (count === 1) {
    return 'One installment'
  }
  if (lastCents === installmentCents) {
    return `${count} installments`
  }
  return `${count} installments, the last one is ${formatMoney(lastCents / 100)}`
}

function ObligationModal({ obligation, onClose, onSaved, onDeleted }) {
  const isEdit = Boolean(obligation)
  const plan = obligation?.plan

  const [name, setName] = useState(obligation?.name ?? '')
  const [amount, setAmount] = useState(
    obligation ? String(obligation.original_amount) : '',
  )
  const [note, setNote] = useState(obligation?.note ?? '')
  const [dueOn, setDueOn] = useState(plan ? '' : (obligation?.due_on ?? ''))
  const [usePlan, setUsePlan] = useState(Boolean(plan))
  const [installment, setInstallment] = useState(
    plan ? String(plan.installment_amount) : '',
  )
  const [frequency, setFrequency] = useState(plan?.frequency ?? 'monthly')
  const [firstDueOn, setFirstDueOn] = useState(plan?.first_due_on ?? todayISO())
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function amountHandler(setter) {
    return (event) => {
      if (isMoneyInput(event.target.value)) {
        setter(event.target.value)
      }
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!(Number(amount) > 0)) {
      setError('Enter an amount greater than zero')
      return
    }

    if (usePlan) {
      if (!(Number(installment) > 0)) {
        setError('Enter the installment amount')
        return
      }
      if (cents(installment) > cents(amount)) {
        setError("The installment can't be more than the total owed")
        return
      }
      if (!firstDueOn) {
        setError('Pick the first due date')
        return
      }
    }

    const payload = {
      name: name.trim(),
      original_amount: Number(amount).toFixed(2),
      note: note.trim() || null,
      due_on: usePlan ? null : dueOn || null,
      installment_amount: usePlan ? Number(installment).toFixed(2) : null,
      frequency: usePlan ? frequency : null,
      first_due_on: usePlan ? firstDueOn : null,
    }

    setSubmitting(true)
    try {
      if (isEdit) {
        await updateObligation(obligation.id, payload)
      } else {
        await createObligation(payload)
      }
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    const warning =
      obligation.payments.length > 0
        ? 'Delete this obligation? Its payments are removed too, and the money goes back into the accounts you paid from.'
        : 'Delete this obligation?'
    if (!window.confirm(warning)) {
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await deleteObligation(obligation.id)
      onDeleted()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Edit obligation' : 'Add obligation'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <Field id="obligation-name" label="What is it?">
          <input
            id="obligation-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Laptop loan, Rent arrears"
            maxLength={100}
            autoFocus={!isEdit}
            required
            className={inputClass}
          />
        </Field>

        <Field
          id="obligation-amount"
          label="Total amount owed"
          hint={
            isEdit
              ? 'This is the full amount, not what is left.'
              : 'Enter the full amount you owe.'
          }
        >
          <input
            id="obligation-amount"
            value={amount}
            onChange={amountHandler(setAmount)}
            inputMode="decimal"
            placeholder="0.00"
            required
            className={inputClass}
          />
        </Field>

        <button
          type="button"
          role="switch"
          aria-checked={usePlan}
          onClick={() => setUsePlan(!usePlan)}
          className="flex w-full items-center justify-between rounded-xl border border-line px-4 py-3 text-left"
        >
          <span>
            <span className="block font-medium">Pay in installments</span>
            <span className="block text-xs text-muted">
              Daily, weekly or monthly, with a reminder on each due date
            </span>
          </span>
          <span
            className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${
              usePlan ? 'bg-brand' : 'bg-line'
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full bg-white shadow transition ${
                usePlan ? 'translate-x-5' : ''
              }`}
            />
          </span>
        </button>

        {usePlan ? (
          <div className="space-y-5 rounded-2xl bg-app p-4">
            <Field id="obligation-installment" label="Installment amount">
              <input
                id="obligation-installment"
                value={installment}
                onChange={amountHandler(setInstallment)}
                inputMode="decimal"
                placeholder="0.00"
                className={inputClass}
              />
            </Field>

            <div>
              <p className="mb-1.5 text-sm font-medium text-muted">How often</p>
              <div className="grid grid-cols-3 gap-2">
                {frequencies.map((item) => (
                  <Choice
                    key={item.value}
                    active={frequency === item.value}
                    onClick={() => setFrequency(item.value)}
                  >
                    {item.label}
                  </Choice>
                ))}
              </div>
            </div>

            <Field
              id="obligation-first-due"
              label="First due date"
              hint={describePlan(amount, installment)}
            >
              <input
                id="obligation-first-due"
                type="date"
                value={firstDueOn}
                onChange={(e) => setFirstDueOn(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        ) : (
          <Field id="obligation-due" label="Due date (optional)">
            <input
              id="obligation-due"
              type="date"
              value={dueOn}
              onChange={(e) => setDueOn(e.target.value)}
              className={inputClass}
            />
            {dueOn && (
              <button
                type="button"
                onClick={() => setDueOn('')}
                className="mt-1.5 text-xs font-medium text-muted transition hover:text-ink"
              >
                Clear date
              </button>
            )}
          </Field>
        )}

        <Field id="obligation-note" label="Note (optional)">
          <input
            id="obligation-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Who it is owed to"
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
          {isEdit ? 'Save changes' : 'Save obligation'}
        </button>

        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-3 font-medium text-muted transition hover:border-danger hover:text-danger disabled:opacity-60"
          >
            <Trash2 size={16} /> Delete obligation
          </button>
        )}
      </form>
    </Modal>
  )
}

export default ObligationModal