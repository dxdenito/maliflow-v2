import api from './api'

export async function fetchAlerts() {
  const { data } = await api.get('/alerts')
  return data
}

export function alertLabel(alert) {
  if (alert.kind === 'overdue') {
    const count = Math.abs(alert.days)
    return `${count} day${count === 1 ? '' : 's'} overdue`
  }
  if (alert.kind === 'due_today') {
    return 'Due today'
  }
  if (alert.days === 1) {
    return 'Due tomorrow'
  }
  return `Due in ${alert.days} days`
}

export function alertTone(alert) {
  if (alert.kind === 'overdue') {
    return 'text-danger'
  }
  if (alert.kind === 'due_today') {
    return 'text-warn'
  }
  return 'text-muted'
}