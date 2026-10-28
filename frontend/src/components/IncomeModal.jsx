import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import AccountSelect from './AccountSelect'
import Choice from './Choice'
import Field from './Field'
import Modal from './Modal'
import { incomeTypes } from '../config/incomeTypes'
import { defaultAccountId } from '../lib/accounts'
import { getErrorMessage } from '../lib/api'
import { isMoneyInput, todayISO } from '../lib/format'
import { createIncome } from '../lib/income'
import { inputClass } from '../lib/styles'

function IncomeModal({ accounts, onClose, onSaved }) {
  const [source, setSource] = useState('')
  const [incomeType, setIncomeType] = useState('salary')
  const [expectedAmount, setExpectedAmount] = useState('')
  const [expectedOn, setExpectedOn] = useState(todayISO())
  const [period, setPeriod] = useState('')
  const [received, setReceived] = useState(false)
  const [receivedAmount, setReceivedAmount] = useState('')
  const [receivedOn, setReceivedOn] = useState(todayISO())
  const [accountId, setAccountId] = useState(defaultAccountId(accounts))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canReceive = accounts.length > 0

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

    const finalReceived = receivedAmount || expectedAmount
    if (!(Number(expectedAmount) > 0) || (received && !(Number(finalReceived) > 0))) {
      setError('Enter an amount greater than zero')
      return
    }

    const payload = {
      source: source.trim(),
      income_type: incomeType,
      expected_amount: expectedAmount,
      expected_on: expectedOn,
      period: `${period || expectedOn.slice(0, 7)}-01`,
    }

    if (received) {
      payload.received_amount = finalReceived
      payload.received_on = receivedOn
      payload.account_id = accountId
    }

    setSubmitting(true)
    try {
      await createIncome(payload)
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Add income" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <Field id="income-source" label="Source">
          <input
            id="income-source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g. Salary, Logo design"
            maxLength={100}
            required
            className={inputClass}
          />
        </Field>

        <div>
          <p className="mb-1.5 text-sm font-medium text-muted">Type</p>
          <div className="grid grid-cols-2 gap-2">
            {incomeTypes.map((type) => (
              <Choice
                key={type.value}
                active={incomeType === type.value}
                onClick={() => setIncomeType(type.value)}
              >
                <span className="flex items-center gap-2">
                  <type.icon size={16} /> {type.label}
                </span>
              </Choice>
            ))}
          </div>
        </div>

        <Field id="income-expected" label="Expected amount">
          <input
            id="income-expected"
            value={expectedAmount}
            onChange={amountHandler(setExpectedAmount)}
            inputMode="decimal"
            placeholder="0.00"
            required
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field id="income-expected-on" label="Expected on">
            <input
              id="income-expected-on"
              type="date"
              value={expectedOn}
              onChange={(e) => setExpectedOn(e.target.value)}
              required
              className={inputClass}
            />
          </Field>
          <Field id="income-period" label="Counts toward">
            <input
              id="income-period"
              type="month"
              value={period || expectedOn.slice(0, 7)}
              onChange={(e) => setPeriod(e.target.value)}
              required
              className={inputClass}
            />
          </Field>
        </div>

        {canReceive ? (
          <button
            type="button"
            role="switch"
            aria-checked={received}
            onClick={() => setReceived(!received)}
            className="flex w-full items-center justify-between rounded-xl border border-line px-4 py-3 text-left"
          >
            <span>
              <span className="block font-medium">Already received</span>
              <span className="block text-xs text-muted">
                The money is already in one of your accounts
              </span>
            </span>
            <span
              className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${
                received ? 'bg-brand' : 'bg-line'
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full bg-white shadow transition ${
                  received ? 'translate-x-5' : ''
                }`}
              />
            </span>
          </button>
        ) : (
          <p className="text-xs text-muted">
            Add an account first if you want to record money as received.
          </p>
        )}

        {received && (
          <div className="space-y-5 rounded-2xl bg-app p-4">
            <Field id="income-received" label="Amount received">
              <input
                id="income-received"
                value={receivedAmount}
                onChange={amountHandler(setReceivedAmount)}
                inputMode="decimal"
                placeholder={expectedAmount || '0.00'}
                className={inputClass}
              />
            </Field>
            <Field id="income-received-on" label="Received on">
              <input
                id="income-received-on"
                type="date"
                max={todayISO()}
                value={receivedOn}
                onChange={(e) => setReceivedOn(e.target.value)}
                required
                className={inputClass}
              />
            </Field>
            <AccountSelect
              id="income-account"
              label="Into account"
              accounts={accounts}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-brand transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
        >
          {submitting && <Loader2 size={18} className="animate-spin" />}
          Save income
        </button>
      </form>
    </Modal>
  )
}

export default IncomeModal