import api from './api'

export async function fetchSavingsEntries(month) {
  const { data } = await api.get('/savings', { params: { month } })
  return data
}

export async function fetchSavingsSummary(month) {
  const { data } = await api.get('/savings/summary', { params: { month } })
  return data
}

export async function depositToSavings(payload) {
  const { data } = await api.post('/savings/deposits', payload)
  return data
}

export async function withdrawFromSavings(payload) {
  const { data } = await api.post('/savings/withdrawals', payload)
  return data
}

export async function deleteSavingsEntry(entryId) {
  await api.delete(`/savings/${entryId}`)
}