import { formatMoney } from './format'

let counter = 0

export function createRow(accountId = '') {
  counter += 1
  return { key: `allocation-${counter}`, accountId, amount: '' }
}

export function toCents(value) {
  return Math.round(Number(value || 0) * 100)
}

export function rowsTotalCents(rows) {
  return rows.reduce((sum, row) => sum + toCents(row.amount), 0)
}

export function withSingleAmount(rows, total) {
  if (rows.length === 1) {
    return [{ ...rows[0], amount: String(total) }]
  }
  return rows
}

export function rowsToPayload(rows) {
  return rows
    .filter((row) => toCents(row.amount) > 0)
    .map((row) => ({
      account_id: row.accountId,
      amount: (toCents(row.amount) / 100).toFixed(2),
    }))
}

export function validateRows(rows, accounts, targetCents) {
  const used = rows.filter((row) => toCents(row.amount) > 0)

  if (used.length === 0) {
    return 'Choose where the money comes from'
  }

  const ids = used.map((row) => row.accountId)
  if (ids.some((id) => !id)) {
    return 'Choose an account for each amount'
  }
  if (new Set(ids).size !== ids.length) {
    return 'Each account can only be used once'
  }

  for (const row of used) {
    const account = accounts.find((item) => item.id === row.accountId)
    if (!account) {
      return 'Choose an account for each amount'
    }
    if (toCents(row.amount) > toCents(account.balance)) {
      return `${account.name} doesn't hold enough for that`
    }
  }

  if (targetCents !== null && rowsTotalCents(used) !== targetCents) {
    return `The amounts must add up to ${formatMoney(targetCents / 100)}`
  }

  return ''
}