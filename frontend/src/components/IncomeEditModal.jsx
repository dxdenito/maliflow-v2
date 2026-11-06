import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import Choice from './Choice'
import Field from './Field'
import Modal from './Modal'
import { incomeTypes } from '../config/incomeTypes'
import { getErrorMessage } from '../lib/api'
import { formatMoney, isMoneyInput } from '../lib/format'
import { deleteIncome, updateIncome } from '../lib/income'
import { inputClass } from '../lib/styles'

function IncomeEditModal({ income, onClose, onSaved, onDeleted }) {
  const [source, setSource] = useState(income.source)
  const [type, setType] = useState(income.income_type)
  const [expected, setExpected] = useState(String(income.expected_amount))
  const [expectedOn, setExpectedOn] = useState(income.expected_on)
  const [period, setPeriod] = useState(income.period.slice(0, 7))
  const [note, setNote] = useState(income.note ?? '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const received = Number(income.received_total)

  function handleExpectedChange(event) {
    if (isMoneyInput(event.target.value)) {
      setExpected(event.target.value)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!(Number(expected) > 0)) {
      setError('Enter an amount greater than zero')
      return
    }
    if (!period) {
      setError('Pick the month this income counts toward')
      return
    }

    setSubmitting(true)
    try {
      await updateIncome(income.id, {
        source: source.trim(),
        income_type: type,
        expected_amount: Number(expected).toFixed(2),
        expected_on: expectedOn,
        period: `${period}-01`,
        note: note.trim() || null,
      })
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    const warning =
      income.receipts.length > 0
        ? 'Delete this income? Its payments are removed too, and the money is taken back out of the accounts.'
        : 'Delete this income?'
    if (!window.confirm(warning)) {
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await deleteIncome(income.id)
      onDeleted()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Edit income" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <Field id="edit-income-source" label="Source">
          <input
            id="edit-income-source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            maxLength={100}
            required
            className={inputClass}
          />
        </Field>

        <div>
          <p className="mb-1.5 text-sm font-medium text-muted">Type</p>
          <div className="grid grid-cols-2 gap-2">
            {incomeTypes.map((item) => (
              <Choice
                key={item.value}
                active={type === item.value}
                onClick={() => setType(item.value)}
              >
                <span className="flex items-center gap-2">
                  <item.icon size={16} /> {item.label}
                </span>
              </Choice>
            ))}
          </div>
        </div>

        <Field
          id="edit-income-expected"
          label="Expected amount"
          hint={
            received > 0
              ? `You have received ${formatMoney(received)} so far.`
              : null
          }
        >
          <input
            id="edit-income-expected"
            value={expected}
            onChange={handleExpectedChange}
            inputMode="decimal"
            placeholder="0.00"
            required
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field id="edit-income-date" label="Expected on">
            <input
              id="edit-income-date"
              type="date"
              value={expectedOn}
              onChange={(e) => setExpectedOn(e.target.value)}
              required
              className={inputClass}
            />
          </Field>
          <Field id="edit-income-period" label="Counts toward">
            <input
              id="edit-income-period"
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              required
              className={inputClass}
            />
          </Field>
        </div>

        <Field id="edit-income-note" label="Note (optional)">
          <input
            id="edit-income-note"
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
          Save changes
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-3 font-medium text-muted transition hover:border-danger hover:text-danger disabled:opacity-60"
        >
          <Trash2 size={16} /> Delete income
        </button>
      </form>
    </Modal>
  )
}

export default IncomeEditModal