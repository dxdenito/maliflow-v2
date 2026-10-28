import api from './api'

export async function fetchAccounts(includeInactive = false) {
  const { data } = await api.get('/accounts', {
    params: { include_inactive: includeInactive },
  })
  return data
}

export async function fetchAccountSummary() {
  const { data } = await api.get('/accounts/summary')
  return data
}

export async function createAccount(payload) {
  const { data } = await api.post('/accounts', payload)
  return data
}

export async function updateAccount(accountId, payload) {
  const { data } = await api.patch(`/accounts/${accountId}`, payload)
  return data
}

export function defaultAccountId(accounts) {
  const spendable = accounts.find((account) => account.pool === 'available')
  return spendable?.id ?? accounts[0]?.id ?? ''
}