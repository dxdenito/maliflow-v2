import api from './api'

export async function fetchBudget(month) {
  const { data } = await api.get(`/budgets/${month}`)
  return data
}

export async function saveBudget(month, payload) {
  const { data } = await api.put(`/budgets/${month}`, payload)
  return data
}

export async function deleteBudget(month) {
  await api.delete(`/budgets/${month}`)
}