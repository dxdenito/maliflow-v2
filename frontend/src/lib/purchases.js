import api from './api'
import { toCents } from './allocations'
import { daysFromToday, formatDate, todayISO } from './format'
import { planLabel } from './obligations'

export async function fetchPurchases() {
  const { data } = await api.get('/purchases')
  return data
}

export async function fetchPurchaseSummary() {
  const { data } = await api.get('/purchases/summary')
  return data
}

export async function createPurchase(payload) {
  const { data } = await api.post('/purchases', payload)
  return data
}

export async function updatePurchase(purchaseId, payload) {
  const { data } = await api.patch(`/purchases/${purchaseId}`, payload)
  return data
}

export async function deletePurchase(purchaseId) {
  await api.delete(`/purchases/${purchaseId}`)
}

export async function addPurchasePayment(purchaseId, payload) {
  const { data } = await api.post(`/purchases/${purchaseId}/payments`, payload)
  return data
}

export async function deletePurchasePayment(paymentId) {
  await api.delete(`/purchases/payments/${paymentId}`)
}

export function initialPlan(plan) {
  return {
    enabled: Boolean(plan),
    installment: plan ? String(plan.installment_amount) : '',
    frequency: plan?.frequency ?? 'monthly',
    firstDueOn: plan?.first_due_on ?? todayISO(),
  }
}

export function planPayload(plan) {
  if (!plan.enabled) {
    return { installment_amount: null, frequency: null, first_due_on: null }
  }
  return {
    installment_amount: Number(plan.installment).toFixed(2),
    frequency: plan.frequency,
    first_due_on: plan.firstDueOn,
  }
}

export function validatePlan(plan, financedCents) {
  if (!plan.enabled) {
    return ''
  }
  if (financedCents <= 0) {
    return 'There is nothing left to finance, so installments are not needed'
  }
  if (!(Number(plan.installment) > 0)) {
    return 'Enter the installment amount'
  }
  if (toCents(plan.installment) > financedCents) {
    return "The installment can't be more than the amount being financed"
  }
  if (!plan.firstDueOn) {
    return 'Pick the first due date'
  }
  return ''
}

function dueText(dueOn) {
  const days = daysFromToday(dueOn)

  if (days < 0) {
    const count = Math.abs(days)
    return `${count} day${count === 1 ? '' : 's'} overdue`
  }
  if (days === 0) {
    return 'Due today'
  }
  if (days === 1) {
    return 'Due tomorrow'
  }
  return `Due ${formatDate(dueOn)}`
}

export function purchaseSubtitle(purchase) {
  if (purchase.status === 'paid') {
    return purchase.kind === 'cash'
      ? `Paid ${formatDate(purchase.purchased_on)}`
      : 'Paid in full'
  }

  if (purchase.due_on) {
    const text = dueText(purchase.due_on)
    const plan = planLabel(purchase)
    return plan ? `${text} · ${plan}` : text
  }

  return purchase.lender ? `Financed by ${purchase.lender}` : 'Financed'
}

export function purchaseTone(purchase) {
  if (purchase.status === 'overdue') {
    return 'text-danger'
  }
  if (
    purchase.status === 'open' &&
    purchase.due_on &&
    daysFromToday(purchase.due_on) <= 3
  ) {
    return 'text-warn'
  }
  return 'text-muted'
}

export async function setAssetValue(purchaseId, value) {
  const { data } = await api.put(`/purchases/${purchaseId}/asset`, { value })
  return data
}