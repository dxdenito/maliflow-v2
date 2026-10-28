import api from './api'

export async function fetchIncome(month) {
  const { data } = await api.get('/income', { params: { month } })
  return data
}

export async function fetchIncomeSummary(month) {
  const { data } = await api.get('/income/summary', { params: { month } })
  return data
}

export async function createIncome(payload) {
  const { data } = await api.post('/income', payload)
  return data
}

export async function receiveIncome(incomeId, payload) {
  const { data } = await api.post(`/income/${incomeId}/receive`, payload)
  return data
}

export async function deleteIncome(incomeId) {
  await api.delete(`/income/${incomeId}`)
}