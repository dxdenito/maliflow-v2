import Choice from './Choice'
import Field from './Field'
import { toCents } from '../lib/allocations'
import { formatMoney, isMoneyInput } from '../lib/format'
import { inputClass } from '../lib/styles'

const frequencies = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

function describePlan(financedCents, installmentValue) {
  const installmentCents = toCents(installmentValue)

  if (
    financedCents <= 0 ||
    installmentCents <= 0 ||
    installmentCents > financedCents
  ) {
    return null
  }

  const count = Math.ceil(financedCents / installmentCents)
  const lastCents = financedCents - (count - 1) * installmentCents

  if (count === 1) {
    return 'One installment'
  }
  if (lastCents === installmentCents) {
    return `${count} installments`
  }
  return `${count} installments, the last one is ${formatMoney(lastCents / 100)}`
}

function PlanFields({ value, onChange, financedCents }) {
  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={value.enabled}
        onClick={() => onChange({ enabled: !value.enabled })}
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
            value.enabled ? 'bg-brand' : 'bg-line'
          }`}
        >
          <span
            className={`h-5 w-5 rounded-full bg-white shadow transition ${
              value.enabled ? 'translate-x-5' : ''
            }`}
          />
        </span>
      </button>

      {value.enabled && (
        <div className="space-y-5 rounded-2xl bg-app p-4">
          <Field
            id="plan-installment"
            label="Installment amount"
            hint={
              financedCents > 0
                ? `Amount being financed: ${formatMoney(financedCents / 100)}`
                : null
            }
          >
            <input
              id="plan-installment"
              value={value.installment}
              onChange={(e) => {
                if (isMoneyInput(e.target.value)) {
                  onChange({ installment: e.target.value })
                }
              }}
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
                  active={value.frequency === item.value}
                  onClick={() => onChange({ frequency: item.value })}
                >
                  {item.label}
                </Choice>
              ))}
            </div>
          </div>

          <Field
            id="plan-first-due"
            label="First due date"
            hint={describePlan(financedCents, value.installment)}
          >
            <input
              id="plan-first-due"
              type="date"
              value={value.firstDueOn}
              onChange={(e) => onChange({ firstDueOn: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>
      )}
    </>
  )
}

export default PlanFields