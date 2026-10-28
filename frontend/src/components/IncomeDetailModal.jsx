import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import Modal from './Modal'
import { getErrorMessage } from '../lib/api'
import { formatDate, formatMoney, formatMonth } from '../lib/format'
import { deleteIncome } from '../lib/income'

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

function IncomeDetailModal({ income, accountName, onClose, onSaved }) {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleDelete() {
    if (
      !window.confirm(
        'Delete this income? The money will also be removed from the account.',
      )
    ) {
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
    <Modal title={income.source} onClose={onClose}>
      <div className="space-y-5">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="divide-y divide-line rounded-2xl bg-app px-4">
          <DetailRow
            label="Received"
            value={formatMoney(income.received_amount)}
          />
          <DetailRow
            label="Expected"
            value={formatMoney(income.expected_amount)}
          />
          <DetailRow label="Received on" value={formatDate(income.received_on)} />
          <DetailRow label="Into account" value={accountName} />
          <DetailRow
            label="Counts toward"
            value={formatMonth(income.period.slice(0, 7))}
          />
          {income.note && <DetailRow label="Note" value={income.note} />}
        </div>

        <button
          onClick={handleDelete}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-3 font-medium text-muted transition hover:border-danger hover:text-danger disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Trash2 size={16} />
          )}
          Delete income
        </button>
      </div>
    </Modal>
  )
}

export default IncomeDetailModal