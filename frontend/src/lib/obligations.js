import api from './api'
import { daysFromToday, formatDate, formatMoney } from './format'

export async function fetchObligations() {
  const { data } = await api.get('/obligations')
  return data
}

export async function fetchObligationSummary() {
  const { data } = await api.get('/obligations/summary')
  return data
}

export async function createObligation(payload) {
  const { data } = await api.post('/obligations', payload)
  return data
}

export async function updateObligation(obligationId, payload) {
  const { data } = await api.patch(`/obligations/${obligationId}`, payload)
  return data
}

export async function deleteObligation(obligationId) {
  await api.delete(`/obligations/${obligationId}`)
}

export async function addPayment(obligationId, payload) {
  const { data } = await api.post(
    `/obligations/${obligationId}/payments`,
    payload,
  )
  return data
}

export async function deletePayment(paymentId) {
  await api.delete(`/obligations/payments/${paymentId}`)
}

export function planLabel(obligation) {
  if (!obligation.plan) {
    return null
  }
  return `${formatMoney(obligation.plan.installment_amount)} ${obligation.plan.frequency}`
}

export function dueLabel(obligation) {
  if (obligation.status === 'settled') {
    return 'Settled'
  }
  if (!obligation.due_on) {
    return 'No due date'
  }

  const days = daysFromToday(obligation.due_on)
  let label

  if (days < 0) {
    const count = Math.abs(days)
    label = `${count} day${count === 1 ? '' : 's'} overdue`
  } else if (days === 0) {
    label = 'Due today'
  } else if (days === 1) {
    label = 'Due tomorrow'
  } else {
    label = `Due ${formatDate(obligation.due_on)}`
  }

  const plan = planLabel(obligation)
  return plan ? `${label} · ${plan}` : label
}

export function dueTone(obligation) {
  if (obligation.status === 'settled') {
    return 'text-brand'
  }
  if (obligation.status === 'overdue') {
    return 'text-danger'
  }
  if (obligation.due_on && daysFromToday(obligation.due_on) <= 3) {
    return 'text-warn'
  }
  return 'text-muted'
}