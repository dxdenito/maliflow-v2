import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import Modal from './Modal'
import { getErrorMessage } from '../lib/api'
import { formatDate, formatMoney } from '../lib/format'
import { deletePayment, dueLabel, dueTone } from '../lib/obligations'

function PlanRow({ label, value, tone = '' }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-muted">{label}</span>
      <span className={`text-right font-medium ${tone}`}>{value}</span>
    </div>
  )
}

function ObligationDetailModal({
  obligation,
  accountNames,
  onPay,
  onEdit,
  onChanged,
  onClose,
}) {
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const plan = obligation.plan
  const paid = Number(obligation.paid_total)
  const total = Number(obligation.original_amount)
  const progress = total > 0 ? Math.min(100, (paid / total) * 100) : 0
  const settled = obligation.status === 'settled'

  async function handleDeletePayment(payment) {
    if (
      !window.confirm('Delete this payment? The money goes back into the account.')
    ) {
      return
    }
    setError('')
    setBusyId(payment.id)
    try {
      await deletePayment(payment.id)
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Modal title={obligation.name} onClose={onClose}>
      <div className="space-y-5">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className={`font-medium ${dueTone(obligation)}`}>
              {dueLabel(obligation)}
            </span>
            <span className="shrink-0 text-muted">
              {formatMoney(paid)} of {formatMoney(total)} paid
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-app">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-app p-3">
            <p className="text-xs text-muted">Paid</p>
            <p className="mt-0.5 font-bold text-brand">
              {formatMoney(obligation.paid_total)}
            </p>
          </div>
          <div className="rounded-xl bg-app p-3">
            <p className="text-xs text-muted">Still owed</p>
            <p
              className={`mt-0.5 font-bold ${
                obligation.status === 'overdue' ? 'text-danger' : ''
              }`}
            >
              {formatMoney(obligation.outstanding)}
            </p>
          </div>
        </div>

        {plan && (
          <div className="divide-y divide-line rounded-2xl bg-app px-4 text-sm">
            <PlanRow
              label="Plan"
              value={`${formatMoney(plan.installment_amount)} ${plan.frequency}`}
            />
            <PlanRow
              label="Installments paid"
              value={`${plan.installments_paid} of ${plan.installments_total}`}
            />
            {!settled && plan.next_due_on && (
              <PlanRow
                label="Next due"
                value={`${formatDate(plan.next_due_on)} · ${formatMoney(plan.next_due_amount)}`}
              />
            )}
            {plan.overdue_count > 0 && (
              <PlanRow
                label="Behind by"
                tone="text-danger"
                value={`${plan.overdue_count} installment${
                  plan.overdue_count === 1 ? '' : 's'
                } · ${formatMoney(plan.overdue_amount)}`}
              />
            )}
          </div>
        )}

        {obligation.note && (
          <p className="text-sm text-muted">{obligation.note}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          {!settled ? (
            <button
              onClick={onPay}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-on-brand transition hover:brightness-110 active:scale-95"
            >
              <Plus size={16} /> Make a payment
            </button>
          ) : (
            <div className="flex items-center justify-center rounded-xl bg-brand/10 py-3 text-sm font-semibold text-brand">
              Fully paid
            </div>
          )}
          <button
            onClick={onEdit}
            className="flex items-center justify-center gap-2 rounded-xl border border-line py-3 text-sm font-medium transition hover:border-brand active:scale-95"
          >
            <Pencil size={16} /> Edit
          </button>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">
            Payments
          </p>
          {obligation.payments.length === 0 ? (
            <p className="text-sm text-muted">No payments yet.</p>
          ) : (
            <div className="divide-y divide-line rounded-2xl border border-line">
              {obligation.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      {formatDate(payment.paid_on)}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {accountNames[payment.account_id] ?? 'an account'}
                      {payment.note ? ` · ${payment.note}` : ''}
                    </span>
                  </span>
                  <span className="font-bold">
                    -{formatMoney(payment.amount)}
                  </span>
                  <button
                    onClick={() => handleDeletePayment(payment)}
                    disabled={busyId === payment.id}
                    aria-label="Delete payment"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:text-danger disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default ObligationDetailModal