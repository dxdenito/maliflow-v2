import api from './api'

export async function fetchMonthReport(month) {
  const { data } = await api.get('/reports/month', { params: { month } })
  return data
}

export async function fetchTrend(month, months = 6) {
  const { data } = await api.get('/reports/trend', {
    params: { month, months },
  })
  return data
}

export function shortMonth(period) {
  const [year, month] = period.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'short',
  })
}

export function percentText(value) {
  if (value === null || value === undefined) {
    return '—'
  }
  return `${Number(value).toFixed(1).replace(/\.0$/, '')}%`
}