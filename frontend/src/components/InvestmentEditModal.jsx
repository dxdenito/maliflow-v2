import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import Choice from './Choice'
import Field from './Field'
import Modal from './Modal'
import { investmentTypes } from '../config/investmentTypes'
import { getErrorMessage } from '../lib/api'
import { deleteInvestment, updateInvestment } from '../lib/investments'
import { inputClass } from '../lib/styles'

function InvestmentEditModal({ investment, onClose, onSaved, onDeleted }) {
  const [name, setName] = useState(investment.name)
  const [type, setType] = useState(investment.investment_type)
  const [note, setNote] = useState(investment.note ?? '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canDelete = investment.events.length === 0

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await updateInvestment(investment.id, {
        name: name.trim(),
        investment_type: type,
        note: note.trim() || null,
      })
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this investment?')) {
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await deleteInvestment(investment.id)
      onDeleted()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Edit investment" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <Field id="edit-investment-name" label="Name">
          <input
            id="edit-investment-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
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

        <Field id="edit-investment-note" label="Note (optional)">
          <input
            id="edit-investment-note"
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

        {canDelete ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-3 font-medium text-muted transition hover:border-danger hover:text-danger disabled:opacity-60"
          >
            <Trash2 size={16} /> Delete investment
          </button>
        ) : (
          <p className="text-center text-xs text-muted">
            An investment with activity can't be deleted. Remove its history
            entries first if you really want it gone.
          </p>
        )}
      </form>
    </Modal>
  )
}

export default InvestmentEditModal