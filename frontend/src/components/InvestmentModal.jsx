import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import Choice from './Choice'
import Field from './Field'
import Modal from './Modal'
import { investmentTypes } from '../config/investmentTypes'
import { getErrorMessage } from '../lib/api'
import { isMoneyInput, todayISO } from '../lib/format'
import { createInvestment } from '../lib/investments'
import { inputClass } from '../lib/styles'

function InvestmentModal({ onClose, onSaved }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('stock')
  const [note, setNote] = useState('')
  const [holding, setHolding] = useState(false)
  const [capital, setCapital] = useState('')
  const [value, setValue] = useState('')
  const [asOf, setAsOf] = useState(todayISO())
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

    const payload = {
      name: name.trim(),
      investment_type: type,
      note: note.trim() || null,
    }

    if (holding) {
      if (!(Number(capital) > 0)) {
        setError('Enter how much you originally invested')
        return
      }
      payload.initial_capital = Number(capital).toFixed(2)
      if (value !== '') {
        payload.current_value = Number(value).toFixed(2)
      }
      payload.as_of = asOf
    }

    setSubmitting(true)
    try {
      const created = await createInvestment(payload)
      onSaved(created.id)
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Add investment" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <Field id="investment-name" label="Name">
          <input
            id="investment-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Safaricom shares, Sanlam MMF"
            maxLength={100}
            autoFocus
            required
            className={inputClass}
          />
        </Field>

        <div>
          <p className="mb-1.5 text-sm font-medium text-muted">Type</p>
          <div className="grid grid-cols-2 gap-2">
            {investmentTypes.map((item) => (
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

        <button
          type="button"
          role="switch"
          aria-checked={holding}
          onClick={() => setHolding(!holding)}
          className="flex w-full items-center justify-between rounded-xl border border-line px-4 py-3 text-left"
        >
          <span>
            <span className="block font-medium">I already hold this</span>
            <span className="block text-xs text-muted">
              Money invested before using MaliFlow, so it isn't counted as
              income or spending
            </span>
          </span>
          <span
            className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${
              holding ? 'bg-brand' : 'bg-line'
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full bg-white shadow transition ${
                holding ? 'translate-x-5' : ''
              }`}
            />
          </span>
        </button>

        {holding && (
          <div className="space-y-5 rounded-2xl bg-app p-4">
            <Field
              id="investment-capital"
              label="Amount you originally invested"
            >
              <input
                id="investment-capital"
                value={capital}
                onChange={amountHandler(setCapital)}
                inputMode="decimal"
                placeholder="0.00"
                className={inputClass}
              />
            </Field>

            <Field
              id="investment-value"
              label="What it is worth today"
              hint="Leave blank if it is still worth what you put in."
            >
              <input
                id="investment-value"
                value={value}
                onChange={amountHandler(setValue)}
                inputMode="decimal"
                placeholder={capital || '0.00'}
                className={inputClass}
              />
            </Field>

            <Field id="investment-as-of" label="As of">
              <input
                id="investment-as-of"
                type="date"
                max={todayISO()}
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        )}

        <Field id="investment-note" label="Note (optional)">
          <input
            id="investment-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Broker or fund manager"
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
          Save investment
        </button>
      </form>
    </Modal>
  )
}

export default InvestmentModal