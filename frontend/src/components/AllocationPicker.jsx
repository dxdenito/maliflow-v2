import { Plus, X } from 'lucide-react'
import { createRow, rowsTotalCents, toCents } from '../lib/allocations'
import { formatMoney, isMoneyInput } from '../lib/format'
import { inputClass } from '../lib/styles'

function accountLabel(account) {
  const pool = account.pool === 'savings' ? ' · savings' : ''
  return `${account.name}${pool} · ${formatMoney(account.balance)}`
}

function AllocationPicker({
  accounts,
  rows,
  onChange,
  label,
  targetCents = null,
  hideSingleAmount = false,
}) {
  const showAmounts = !(hideSingleAmount && rows.length === 1)
  const usedIds = rows.map((row) => row.accountId)
  const unused = accounts.filter((account) => !usedIds.includes(account.id))
  const differenceCents =
    targetCents === null ? 0 : targetCents - rowsTotalCents(rows)

  function updateRow(key, changes) {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...changes } : row)))
  }

  function removeRow(key) {
    onChange(rows.filter((row) => row.key !== key))
  }

  function addRow() {
    const next = createRow(unused[0]?.id ?? '')

    if (hideSingleAmount && rows.length === 1 && targetCents > 0) {
      const first = rows[0]
      const account = accounts.find((item) => item.id === first.accountId)
      const firstCents = account
        ? Math.min(targetCents, toCents(account.balance))
        : targetCents
      const restCents = targetCents - firstCents

      onChange([
        { ...first, amount: (firstCents / 100).toFixed(2) },
        { ...next, amount: restCents > 0 ? (restCents / 100).toFixed(2) : '' },
      ])
      return
    }

    onChange([...rows, next])
  }

  function fillRest(row) {
    const othersCents = rows
      .filter((item) => item.key !== row.key)
      .reduce((sum, item) => sum + toCents(item.amount), 0)
    const account = accounts.find((item) => item.id === row.accountId)
    const restCents = Math.max(0, targetCents - othersCents)
    const cappedCents = account
      ? Math.min(restCents, toCents(account.balance))
      : restCents

    updateRow(row.key, { amount: (cappedCents / 100).toFixed(2) })
  }

  function handleAmountChange(row, value) {
    if (isMoneyInput(value)) {
      updateRow(row.key, { amount: value })
    }
  }

  return (
    <div>
      {label && (
        <p className="mb-1.5 text-sm font-medium text-muted">{label}</p>
      )}

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.key} className="flex items-start gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <select
                aria-label="Account"
                value={row.accountId}
                onChange={(e) => updateRow(row.key, { accountId: e.target.value })}
                className={inputClass}
              >
                {accounts
                  .filter(
                    (account) =>
                      account.id === row.accountId ||
                      !usedIds.includes(account.id),
                  )
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {accountLabel(account)}
                    </option>
                  ))}
              </select>

              {showAmounts && (
                <div className="flex items-center gap-3">
                  <input
                    aria-label="Amount from this account"
                    value={row.amount}
                    onChange={(e) => handleAmountChange(row, e.target.value)}
                    inputMode="decimal"
                    placeholder="0.00"
                    className={inputClass}
                  />
                  {targetCents !== null && (
                    <button
                      type="button"
                      onClick={() => fillRest(row)}
                      className="shrink-0 text-xs font-semibold text-brand"
                    >
                      Fill rest
                    </button>
                  )}
                </div>
              )}
            </div>

            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(row.key)}
                aria-label="Remove account"
                className="flex h-12 w-10 shrink-0 items-center justify-center text-muted transition hover:text-danger"
              >
                <X size={18} />
              </button>
            )}
          </div>
        ))}
      </div>

      {showAmounts && targetCents !== null && (
        <p
          className={`mt-2 text-sm font-medium ${
            differenceCents === 0
              ? 'text-brand'
              : differenceCents < 0
                ? 'text-danger'
                : 'text-muted'
          }`}
        >
          {differenceCents === 0
            ? `Adds up to ${formatMoney(targetCents / 100)}`
            : differenceCents < 0
              ? `Over by ${formatMoney(Math.abs(differenceCents) / 100)}`
              : `${formatMoney(differenceCents / 100)} left to allocate`}
        </p>
      )}

      {unused.length > 0 && (
        <button
          type="button"
          onClick={addRow}
          className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-brand"
        >
          <Plus size={16} />
          {hideSingleAmount && rows.length === 1
            ? 'Split across accounts'
            : 'Add another account'}
        </button>
      )}
    </div>
  )
}

export default AllocationPicker