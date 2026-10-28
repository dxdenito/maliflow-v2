import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import Field from './Field'
import Modal from './Modal'
import { getCategoryIcon } from '../config/categoryIcons'
import { getErrorMessage } from '../lib/api'
import { deleteBudget, saveBudget } from '../lib/budgets'
import { formatMoney, formatMonth, isMoneyInput } from '../lib/format'
import { inputClass } from '../lib/styles'

function cents(value) {
  return Math.round(Number(value || 0) * 100)
}

function BudgetModal({ month, categories, initial, isEdit, onClose, onSaved }) {
  const initialIds = new Set(
    (initial?.items ?? []).map((item) => item.category_id),
  )
  const rows = categories.filter(
    (category) => category.is_active || initialIds.has(category.id),
  )

  const [total, setTotal] = useState(
    initial ? String(initial.total_amount) : '',
  )
  const [amounts, setAmounts] = useState(
    Object.fromEntries(
      (initial?.items ?? []).map((item) => [
        item.category_id,
        String(item.allocated),
      ]),
    ),
  )
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const allocatedCents = rows.reduce(
    (sum, category) => sum + cents(amounts[category.id]),
    0,
  )
  const unallocatedCents = cents(total) - allocatedCents
  const over = unallocatedCents < 0

  function handleTotalChange(event) {
    if (isMoneyInput(event.target.value)) {
      setTotal(event.target.value)
    }
  }

  function handleAmountChange(categoryId, value) {
    if (isMoneyInput(value)) {
      setAmounts((current) => ({ ...current, [categoryId]: value }))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (cents(total) <= 0) {
      setError('Enter a monthly budget greater than zero')
      return
    }
    if (over) {
      setError('Your category amounts add up to more than the monthly budget')
      return
    }

    const items = rows
      .filter((category) => cents(amounts[category.id]) > 0)
      .map((category) => ({
        category_id: category.id,
        amount: Number(amounts[category.id]).toFixed(2),
      }))

    setSubmitting(true)
    try {
      await saveBudget(month, {
        total_amount: Number(total).toFixed(2),
        items,
      })
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Remove the budget for this month?')) {
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await deleteBudget(month)
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Edit budget' : 'Set up budget'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-muted">
          {formatMonth(month)}
          {initial && !isEdit && ' · copied from last month, adjust anything you like'}
        </p>

        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <Field id="budget-total" label="Monthly budget">
          <input
            id="budget-total"
            value={total}
            onChange={handleTotalChange}
            inputMode="decimal"
            placeholder="0.00"
            autoFocus
            required
            className={inputClass}
          />
        </Field>

        <div>
          <p className="mb-1.5 text-sm font-medium text-muted">
            Category limits (optional)
          </p>
          <div className="divide-y divide-line rounded-2xl border border-line">
            {rows.map((category) => {
              const Icon = getCategoryIcon(category.icon)
              return (
                <div
                  key={category.id}
                  className="flex items-center gap-3 px-3 py-2"
                >
                  <Icon size={18} className="shrink-0 text-brand" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {category.name}
                  </span>
                  <input
                    aria-label={`${category.name} limit`}
                    value={amounts[category.id] ?? ''}
                    onChange={(e) =>
                      handleAmountChange(category.id, e.target.value)
                    }
                    inputMode="decimal"
                    placeholder="0.00"
                    className="w-28 rounded-lg border border-line bg-app px-3 py-2 text-right text-base text-ink outline-none transition placeholder:text-muted/60 focus:border-brand focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              )
            })}
          </div>
          <p
            className={`mt-2 text-sm font-medium ${
              over ? 'text-danger' : 'text-muted'
            }`}
          >
            {over
              ? `Over by ${formatMoney(Math.abs(unallocatedCents) / 100)}`
              : `Left to allocate: ${formatMoney(unallocatedCents / 100)}`}
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-brand transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
        >
          {submitting && <Loader2 size={18} className="animate-spin" />}
          Save budget
        </button>

        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-3 font-medium text-muted transition hover:border-danger hover:text-danger disabled:opacity-60"
          >
            <Trash2 size={16} /> Remove this month's budget
          </button>
        )}
      </form>
    </Modal>
  )
}

export default BudgetModal