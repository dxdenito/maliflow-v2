import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import AllocationPicker from './AllocationPicker'
import Choice from './Choice'
import Field from './Field'
import Modal from './Modal'
import PlanFields from './PlanFields'
import { defaultAccountId } from '../lib/accounts'
import {
  createRow,
  rowsToPayload,
  rowsTotalCents,
  toCents,
  validateRows,
  withSingleAmount,
} from '../lib/allocations'
import { getErrorMessage } from '../lib/api'
import { formatMoney, isMoneyInput, todayISO } from '../lib/format'
import {
  createPurchase,
  initialPlan,
  planPayload,
  validatePlan,
} from '../lib/purchases'
import { inputClass } from '../lib/styles'

function NoAccounts() {
  return (
    <p className="text-sm text-muted">
      Add an account first, so there is somewhere to pay from. You can do that
      on the{' '}
      <Link to="/accounts" className="font-semibold text-brand">
        Accounts page
      </Link>
      .
    </p>
  )
}

function PurchaseModal({ accounts, onClose, onSaved }) {
  const usable = accounts.filter((account) => account.is_active)

  const [kind, setKind] = useState('cash')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [charges, setCharges] = useState('')
  const [lender, setLender] = useState('')
  const [purchasedOn, setPurchasedOn] = useState(todayISO())
  const [note, setNote] = useState('')
  const [rows, setRows] = useState(() => [createRow(defaultAccountId(usable))])
  const [hasDeposit, setHasDeposit] = useState(false)
  const [depositRows, setDepositRows] = useState(() => [
    createRow(defaultAccountId(usable)),
  ])
  const [plan, setPlan] = useState(() => initialPlan(null))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const priceCents = toCents(price)
  const chargesCents = toCents(charges)
  const depositCents = hasDeposit ? rowsTotalCents(depositRows) : 0
  const financedCents = priceCents + chargesCents - depositCents

  function amountHandler(setter) {
    return (event) => {
      if (isMoneyInput(event.target.value)) {
        setter(event.target.value)
      }
    }
  }

  function updatePlan(changes) {
    setPlan((current) => ({ ...current, ...changes }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (priceCents <= 0) {
      setError('Enter a price greater than zero')
      return
    }

    let allocations = []

    if (kind === 'cash') {
      const finalRows = withSingleAmount(rows, price)
      const problem = validateRows(finalRows, usable, priceCents)
      if (problem) {
        setError(problem)
        return
      }
      allocations = rowsToPayload(finalRows)
    } else {
      if (hasDeposit) {
        const problem = validateRows(depositRows, usable, null)
        if (problem) {
          setError(problem)
          return
        }
        if (depositCents > priceCents + chargesCents) {
          setError("The deposit can't be more than the total payable")
          return
        }
        allocations = rowsToPayload(depositRows)
      }

      const planProblem = validatePlan(plan, financedCents)
      if (planProblem) {
        setError(planProblem)
        return
      }
    }

    const payload = {
      name: name.trim(),
      kind,
      price: (priceCents / 100).toFixed(2),
      finance_charges:
        kind === 'financed' ? (chargesCents / 100).toFixed(2) : '0.00',
      lender: kind === 'financed' ? lender.trim() || null : null,
      purchased_on: purchasedOn,
      note: note.trim() || null,
      allocations,
      ...planPayload(kind === 'financed' ? plan : { enabled: false }),
    }

    setSubmitting(true)
    try {
      const created = await createPurchase(payload)
      onSaved(created.id)
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Add purchase" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <Field id="purchase-name" label="What did you buy?">
          <input
            id="purchase-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Headphones, Sofa"
            maxLength={100}
            autoFocus
            required
            className={inputClass}
          />
        </Field>

        <div>
          <p className="mb-1.5 text-sm font-medium text-muted">How are you paying?</p>
          <div className="grid grid-cols-2 gap-2">
            <Choice active={kind === 'cash'} onClick={() => setKind('cash')}>
              <span className="block">Cash</span>
              <span className="block text-xs font-normal opacity-70">
                Paid in full now
              </span>
            </Choice>
            <Choice
              active={kind === 'financed'}
              onClick={() => setKind('financed')}
            >
              <span className="block">Financed</span>
              <span className="block text-xs font-normal opacity-70">
                Pay over time
              </span>
            </Choice>
          </div>
        </div>

        <Field id="purchase-price" label="Price">
          <input
            id="purchase-price"
            value={price}
            onChange={amountHandler(setPrice)}
            inputMode="decimal"
            placeholder="0.00"
            required
            className={inputClass}
          />
        </Field>

        {kind === 'financed' && (
          <>
            <Field id="purchase-lender" label="Lender (optional)">
              <input
                id="purchase-lender"
                value={lender}
                onChange={(e) => setLender(e.target.value)}
                placeholder="e.g. Furniture Co"
                maxLength={100}
                className={inputClass}
              />
            </Field>

            <Field
              id="purchase-charges"
              label="Finance charges (optional)"
              hint="Interest or fees added on top of the price"
            >
              <input
                id="purchase-charges"
                value={charges}
                onChange={amountHandler(setCharges)}
                inputMode="decimal"
                placeholder="0.00"
                className={inputClass}
              />
            </Field>

            {priceCents > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-app px-4 py-3 text-sm">
                <span className="text-muted">Total payable</span>
                <span className="font-bold">
                  {formatMoney((priceCents + chargesCents) / 100)}
                </span>
              </div>
            )}
          </>
        )}

        <Field id="purchase-date" label="Date">
          <input
            id="purchase-date"
            type="date"
            max={todayISO()}
            value={purchasedOn}
            onChange={(e) => setPurchasedOn(e.target.value)}
            required
            className={inputClass}
          />
        </Field>

        {kind === 'cash' &&
          (usable.length === 0 ? (
            <NoAccounts />
          ) : (
            <AllocationPicker
              label="Pay from"
              accounts={usable}
              rows={rows}
              onChange={setRows}
              targetCents={priceCents}
              hideSingleAmount
            />
          ))}

        {kind === 'financed' && (
          <>
            {usable.length > 0 && (
              <button
                type="button"
                role="switch"
                aria-checked={hasDeposit}
                onClick={() => setHasDeposit(!hasDeposit)}
                className="flex w-full items-center justify-between rounded-xl border border-line px-4 py-3 text-left"
              >
                <span>
                  <span className="block font-medium">Paying a deposit now</span>
                  <span className="block text-xs text-muted">
                    Taken from one or more of your accounts
                  </span>
                </span>
                <span
                  className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${
                    hasDeposit ? 'bg-brand' : 'bg-line'
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-white shadow transition ${
                      hasDeposit ? 'translate-x-5' : ''
                    }`}
                  />
                </span>
              </button>
            )}

            {hasDeposit && (
              <AllocationPicker
                label="Deposit paid from"
                accounts={usable}
                rows={depositRows}
                onChange={setDepositRows}
              />
            )}

            <PlanFields
              value={plan}
              onChange={updatePlan}
              financedCents={financedCents}
            />
          </>
        )}

        <Field id="purchase-note" label="Note (optional)">
          <input
            id="purchase-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Warranty until 2028"
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
          Save purchase
        </button>
      </form>
    </Modal>
  )
}

export default PurchaseModal