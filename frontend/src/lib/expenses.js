import api from './api'

export async function fetchExpenses(month) {
  const { data } = await api.get('/expenses', { params: { month } })
  return data
}

export async function fetchExpenseSummary(month) {
  const { data } = await api.get('/expenses/summary', { params: { month } })
  return data
}

export async function createExpense(payload) {
  const { data } = await api.post('/expenses', payload)
  return data
}

export async function updateExpense(expenseId, payload) {
  const { data } = await api.patch(`/expenses/${expenseId}`, payload)
  return data
}

export async function deleteExpense(expenseId) {
  await api.delete(`/expenses/${expenseId}`)
}