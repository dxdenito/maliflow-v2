import api from './api'
import { daysFromToday, formatDate, formatMoney } from './format'

export async function fetchInvestments() {
  const { data } = await api.get('/investments')
  return data
}

export async function fetchInvestmentSummary() {
  const { data } = await api.get('/investments/summary')
  return data
}

export async function createInvestment(payload) {
  const { data } = await api.post('/investments', payload)
  return data
}

export async function updateInvestment(investmentId, payload) {
  const { data } = await api.patch(`/investments/${investmentId}`, payload)
  return data
}

export async function deleteInvestment(investmentId) {
  await api.delete(`/investments/${investmentId}`)
}

export async function addContribution(investmentId, payload) {
  const { data } = await api.post(
    `/investments/${investmentId}/contributions`,
    payload,
  )
  return data
}

export async function addWithdrawal(investmentId, payload) {
  const { data } = await api.post(
    `/investments/${investmentId}/withdrawals`,
    payload,
  )
  return data
}

export async function addValuation(investmentId, payload) {
  const { data } = await api.post(
    `/investments/${investmentId}/valuations`,
    payload,
  )
  return data
}

export async function deleteInvestmentEvent(eventId) {
  await api.delete(`/investments/events/${eventId}`)
}

export function signedMoney(value) {
  const number = Number(value)
  const text = formatMoney(Math.abs(number))

  if (number > 0) {
    return `+${text}`
  }
  if (number < 0) {
    return `-${text}`
  }
  return text
}

export function gainTone(value) {
  const number = Number(value)

  if (number > 0) {
    return 'text-brand'
  }
  if (number < 0) {
    return 'text-danger'
  }
  return 'text-muted'
}

export function formatPercent(value) {
  if (value === null || value === undefined) {
    return '—'
  }

  const number = Number(value)
  return `${number > 0 ? '+' : ''}${number.toFixed(2)}%`
}

export function daysSinceValued(investment) {
  if (!investment.last_valued_on) {
    return null
  }
  return -daysFromToday(investment.last_valued_on)
}

export function isStale(investment) {
  const days = daysSinceValued(investment)
  return investment.status === 'active' && days !== null && days > 30
}

export function valuedLabel(investment) {
  const days = daysSinceValued(investment)

  if (days === null) {
    return 'Valued at cost'
  }
  if (days <= 0) {
    return 'Valued today'
  }
  if (days === 1) {
    return 'Valued yesterday'
  }
  if (days < 30) {
    return `Valued ${days} days ago`
  }
  return `Valued ${formatDate(investment.last_valued_on)}`
}