import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import Field from './Field'
import Modal from './Modal'
import PlanFields from './PlanFields'
import { toCents } from '../lib/allocations'
import { getErrorMessage } from '../lib/api'
import { formatMoney, isMoneyInput } from '../lib/format'
import {
  deletePurchase,
  initialPlan,
  planPayload,
  updatePurchase,
  validatePlan,
} from '../lib/purchases'
import { inputClass } from '../lib/styles'

function PurchaseEditModal({ purchase, onClose, onSaved, onDeleted }) {
  const isCash = purchase.kind === 'cash'

  const [name, setName] = useState(purchase.name)
  const [price, setPrice] = useState(String(purchase.price))
  const [charges, setCharges] = useState(String(purchase.finance_charges))
  const [lender, setLender] = useState(purchase.lender ?? '')
  const [purchasedOn, setPurchasedOn] = useState(purchase.purchased_on)
  const [note, setNote] = useState(purchase.note ?? '')
  const [plan, setPlan] = useState(() => initialPlan(purchase.plan))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const priceCents = toCents(price)
  const chargesCents = toCents(charges)
  const financedCents =
    priceCents + chargesCents - toCents(purchase.deposit_paid)

  function amountHandler(setter) {
    return (event) => {
      if (isMoneyInput(event.target.value)) {
        setter(event.target.value)
      }
    }
  }

  function updatePlanFields(changes) {
    setPlan((current) => ({ ...current, ...changes }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (priceCents <= 0) {
      setError('Enter a price greater than zero')
      return
    }

    const payload = {
      name: name.trim(),
      purchased_on: purchasedOn,
      note: note.trim() || null,
    }

    if (!isCash) {
      if (priceCents + chargesCents < toCents(purchase.paid_total)) {
        setError("The total can't be less than what you have already paid")
        return
      }

      const planProblem = validatePlan(plan, financedCents)
      if (planProblem) {
        setError(planProblem)
        return
      }

      Object.assign(payload, {
        price: (priceCents / 100).toFixed(2),
        finance_charges: (chargesCents / 100).toFixed(2),
        lender: lender.trim() || null,
        ...planPayload(plan),
      })
    }

    setSubmitting(true)
    try {
      await updatePurchase(purchase.id, payload)
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    const warning =
      purchase.payments.length > 0
        ? 'Delete this purchase? Its payments are removed too, and the money goes back into the accounts it came from.'
        : 'Delete this purchase?'
    if (!window.confirm(warning)) {
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await deletePurchase(purchase.id)
      onDeleted()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Edit purchase" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <Field id="edit-purchase-name" label="What did you buy?">
          <input
            id="edit-purchase-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
            className={inputClass}
          />
        </Field>

        <Field
          id="edit-purchase-price"
          label="Price"
          hint={
            isCash
              ? "The price of a cash purchase can't change. Delete it and add it again to fix it."
              : null
          }
        >
          <input
            id="edit-purchase-price"
            value={price}
            onChange={amountHandler(setPrice)}
            inputMode="decimal"
            disabled={isCash}
            required
            className={`${inputClass} disabled:opacity-60`}
          />
        </Field>

        {!isCash && (
          <>
            <Field id="edit-purchase-lender" label="Lender (optional)">
              <input
                id="edit-purchase-lender"
                value={lender}
                onChange={(e) => setLender(e.target.value)}
                maxLength={100}
                className={inputClass}
              />
            </Field>

            <Field
              id="edit-purchase-charges"
              label="Finance charges"
              hint="Interest or fees added on top of the price"
            >
              <input
                id="edit-purchase-charges"
                value={charges}
                onChange={amountHandler(setCharges)}
                inputMode="decimal"
                placeholder="0.00"
                className={inputClass}
              />
            </Field>

            <div className="flex items-center justify-between rounded-xl bg-app px-4 py-3 text-sm">
              <span className="text-muted">Total payable</span>
              <span className="font-bold">
                {formatMoney((priceCents + chargesCents) / 100)}
              </span>
            </div>
          </>
        )}

        <Field id="edit-purchase-date" label="Date">
          <input
            id="edit-purchase-date"
            type="date"
            value={purchasedOn}
            onChange={(e) => setPurchasedOn(e.target.value)}
            required
            className={inputClass}
          />
        </Field>

        {!isCash && (
          <PlanFields
            value={plan}
            onChange={updatePlanFields}
            financedCents={financedCents}
          />
        )}

        <Field id="edit-purchase-note" label="Note (optional)">
          <input
            id="edit-purchase-note"
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
          <Trash2 size={16} /> Delete purchase
        </button>
      </form>
    </Modal>
  )
}

export default PurchaseEditModal