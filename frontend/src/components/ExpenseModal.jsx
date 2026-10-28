import { useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import AccountSelect from './AccountSelect'
import Field from './Field'
import Modal from './Modal'
import { getCategoryIcon } from '../config/categoryIcons'
import { defaultAccountId } from '../lib/accounts'
import { getErrorMessage } from '../lib/api'
import { createCategory } from '../lib/categories'
import { createExpense, deleteExpense, updateExpense } from '../lib/expenses'
import { isMoneyInput, todayISO } from '../lib/format'
import { inputClass } from '../lib/styles'

function CategoryTile({ category, active, onClick }) {
  const Icon = getCategoryIcon(category.icon)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition ${
        active
          ? 'border-brand bg-brand/10 text-brand'
          : 'border-line text-muted hover:border-brand/50'
      }`}
    >
      <Icon size={20} />
      <span className="w-full truncate text-center">{category.name}</span>
    </button>
  )
}

function ExpenseModal({
  expense,
  categories,
  accounts,
  onCategoryCreated,
  onClose,
  onSaved,
}) {
  const isEdit = Boolean(expense)
  const paidByOther = isEdit && !expense.account_id
  const usableCategories = categories.filter(
    (category) => category.is_active || category.id === expense?.category_id,
  )
  const usableAccounts = accounts.filter(
    (account) => account.is_active || account.id === expense?.account_id,
  )

  const [amount, setAmount] = useState(expense?.amount ?? '')
  const [categoryId, setCategoryId] = useState(
    expense?.category_id ?? usableCategories[0]?.id ?? '',
  )
  const [accountId, setAccountId] = useState(
    expense?.account_id ?? defaultAccountId(usableAccounts),
  )
  const [spentOn, setSpentOn] = useState(expense?.spent_on ?? todayISO())
  const [description, setDescription] = useState(expense?.description ?? '')
  const [owed, setOwed] = useState(false)
  const [paidBy, setPaidBy] = useState('')
  const [repayBy, setRepayBy] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleAmountChange(event) {
    if (isMoneyInput(event.target.value)) {
      setAmount(event.target.value)
    }
  }

  async function handleAddCategory() {
    const name = newCategoryName.trim()
    if (!name) {
      return
    }
    setError('')
    try {
      const category = await createCategory({ name })
      onCategoryCreated(category)
      setCategoryId(category.id)
      setNewCategoryName('')
      setAddingCategory(false)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  function handleCategoryKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleAddCategory()
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!(Number(amount) > 0)) {
      setError('Enter an amount greater than zero')
      return
    }
    if (!categoryId) {
      setError('Pick a category')
      return
    }

    const payload = {
      category_id: categoryId,
      amount,
      spent_on: spentOn,
      description: description.trim() || null,
    }

    if (!paidByOther) {
      if (!isEdit && owed) {
        if (!paidBy.trim()) {
          setError('Enter who paid for you')
          return
        }
        payload.paid_by = paidBy.trim()
        payload.repay_by = repayBy || null
      } else {
        if (!accountId) {
          setError('Choose the account you paid from')
          return
        }
        payload.account_id = accountId
      }
    }

    setSubmitting(true)
    try {
      if (isEdit) {
        await updateExpense(expense.id, payload)
      } else {
        await createExpense(payload)
      }
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    const warning = expense.obligation_id
      ? 'Delete this expense? The debt it created is removed too.'
      : paidByOther
        ? 'Delete this expense?'
        : 'Delete this expense? The money goes back into the account.'

    if (!window.confirm(warning)) {
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await deleteExpense(expense.id)
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Edit expense' : 'Add expense'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="rounded-2xl bg-app py-6">
          <input
            aria-label="Amount"
            value={amount}
            onChange={handleAmountChange}
            inputMode="decimal"
            placeholder="0.00"
            autoFocus={!isEdit}
            required
            className="w-full bg-transparent text-center text-5xl font-bold tracking-tight text-ink outline-none placeholder:text-muted/40"
          />
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-muted">Category</p>
          <div className="grid grid-cols-3 gap-2">
            {usableCategories.map((category) => (
              <CategoryTile
                key={category.id}
                category={category}
                active={categoryId === category.id}
                onClick={() => setCategoryId(category.id)}
              />
            ))}
            <button
              type="button"
              onClick={() => setAddingCategory(!addingCategory)}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-line px-2 py-3 text-xs font-medium text-muted transition hover:border-brand/50"
            >
              <Plus size={20} />
              New
            </button>
          </div>

          {addingCategory && (
            <div className="mt-3 flex gap-2">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={handleCategoryKeyDown}
                placeholder="Category name"
                maxLength={60}
                className={inputClass}
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="shrink-0 rounded-xl bg-brand px-4 font-semibold text-on-brand transition hover:brightness-110"
              >
                Add
              </button>
            </div>
          )}
        </div>

        {paidByOther && (
          <div className="rounded-xl bg-app px-4 py-3 text-sm text-muted">
            Someone else paid for this, so no account was charged. You can
            change the amount, category or date here. Paying them back is done
            from Obligations.
          </div>
        )}

        {!isEdit && (
          <button
            type="button"
            role="switch"
            aria-checked={owed}
            onClick={() => setOwed(!owed)}
            className="flex w-full items-center justify-between rounded-xl border border-line px-4 py-3 text-left"
          >
            <span>
              <span className="block font-medium">Someone else paid</span>
              <span className="block text-xs text-muted">
                You will pay them back. It counts as spending now and is tracked
                in Obligations.
              </span>
            </span>
            <span
              className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${
                owed ? 'bg-brand' : 'bg-line'
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full bg-white shadow transition ${
                  owed ? 'translate-x-5' : ''
                }`}
              />
            </span>
          </button>
        )}

        {!isEdit && owed && (
          <div className="space-y-5 rounded-2xl bg-app p-4">
            <Field id="expense-paid-by" label="Who paid?">
              <input
                id="expense-paid-by"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                placeholder="e.g. John"
                maxLength={60}
                className={inputClass}
              />
            </Field>
            <Field id="expense-repay-by" label="Pay back by (optional)">
              <input
                id="expense-repay-by"
                type="date"
                value={repayBy}
                onChange={(e) => setRepayBy(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        )}

        {!paidByOther &&
          !owed &&
          (usableAccounts.length > 0 ? (
            <AccountSelect
              id="expense-account"
              label="Paid from"
              accounts={usableAccounts}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            />
          ) : (
            <p className="text-sm text-muted">
              Add an account first, so there is somewhere to take the money
              from. Or switch on "Someone else paid".
            </p>
          ))}

        <Field id="expense-date" label="Date">
          <input
            id="expense-date"
            type="date"
            max={todayISO()}
            value={spentOn}
            onChange={(e) => setSpentOn(e.target.value)}
            required
            className={inputClass}
          />
        </Field>

        <Field id="expense-note" label="Note (optional)">
          <input
            id="expense-note"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Fare to town"
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
          {isEdit ? 'Save changes' : 'Save expense'}
        </button>

        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-3 font-medium text-muted transition hover:border-danger hover:text-danger disabled:opacity-60"
          >
            <Trash2 size={16} /> Delete expense
          </button>
        )}
      </form>
    </Modal>
  )
}

export default ExpenseModal