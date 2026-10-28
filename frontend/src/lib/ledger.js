import api from './api'

export async function fetchLedger(month, { type, accountId } = {}) {
  const params = { month }
  if (type) {
    params.entry_type = type
  }
  if (accountId) {
    params.account_id = accountId
  }
  const { data } = await api.get('/ledger', { params })
  return data
}

export async function fetchLedgerSummary(month) {
  const { data } = await api.get('/ledger/summary', { params: { month } })
  return data
}

export async function createAdjustment(payload) {
  const { data } = await api.post('/ledger/adjustments', payload)
  return data
}

export async function createTransfer(payload) {
  const { data } = await api.post('/ledger/transfers', payload)
  return data
}

export async function deleteLedgerEntry(entryId) {
  await api.delete(`/ledger/${entryId}`)
}

export function entryDirection(entry, accountId) {
  if (accountId) {
    return entry.to_account_id === accountId ? 'in' : 'out'
  }
  if (!entry.from_account_id) {
    return 'in'
  }
  if (!entry.to_account_id) {
    return 'out'
  }
  return 'move'
}