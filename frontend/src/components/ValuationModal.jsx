import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import Field from './Field'
import Modal from './Modal'
import { getErrorMessage } from '../lib/api'
import { formatMoney, isMoneyInput, todayISO } from '../lib/format'
import {
  addValuation,
  formatPercent,
  gainTone,
  signedMoney,
} from '../lib/investments'
import { inputClass } from '../lib/styles'

function ValuationModal({ investment, onClose, onSaved }) {
  const [value, setValue] = useState(String(investment.value))
  const [occurredOn, setOccurredOn] = useState(todayISO())
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const current = Number(investment.value)
  const next = Number(value)
  const change = next - current
  const changePercent = current > 0 ? (change / current) * 100 : null
  const showChange = value !== '' && change !== 0

  function handleValueChange(event) {
    if (isMoneyInput(event.target.value)) {
      setValue(event.target.value)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (value === '') {
      setError('Enter what it is worth')
      return
    }

    setSubmitting(true)
    try {
      await addValuation(investment.id, {
        value: next.toFixed(2),
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
    <Modal title="Update value" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="rounded-2xl bg-app px-4 py-6">
          <input
            aria-label="Current value"
            value={value}
            onChange={handleValueChange}
            inputMode="decimal"
            placeholder="0.00"
            autoFocus
            required
            className="w-full bg-transparent text-center text-5xl font-bold tracking-tight text-ink outline-none placeholder:text-muted/40"
          />
          <p className="mt-3 text-center text-sm text-muted">
            It was last worth {formatMoney(current)}
          </p>
          {showChange && (
            <p
              className={`mt-2 text-center text-sm font-semibold ${gainTone(change)}`}
            >
              {signedMoney(change)}
              {changePercent !== null && ` (${formatPercent(changePercent.toFixed(2))})`}
            </p>
          )}
        </div>

        <Field
          id="valuation-date"
          label="As of"
          hint="Gains and losses update automatically from this value."
        >
          <input
            id="valuation-date"
            type="date"
            max={todayISO()}
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
            required
            className={inputClass}
          />
        </Field>

        <Field id="valuation-note" label="Note (optional)">
          <input
            id="valuation-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Month-end statement"
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
          Save value
        </button>
      </form>
    </Modal>
  )
}

export default ValuationModal