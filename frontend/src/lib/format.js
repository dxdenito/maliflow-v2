const moneyFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatMoney(value) {
  return moneyFormatter.format(Number(value))
}

export function isMoneyInput(value) {
  return /^\d*\.?\d{0,2}$/.test(value)
}

function pad(number) {
  return String(number).padStart(2, '0')
}

export function todayISO() {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function currentMonth() {
  return todayISO().slice(0, 7)
}

export function shiftMonth(month, delta) {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(year, monthNumber - 1 + delta, 1)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

export function formatMonth(month) {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(year, monthNumber - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

export function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
}

export function formatDayLabel(isoDate) {
  const today = todayISO()
  if (isoDate === today) {
    return 'Today'
  }

  const [year, month, day] = today.split('-').map(Number)
  const yesterday = new Date(year, month - 1, day - 1)
  const yesterdayISO = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`
  if (isoDate === yesterdayISO) {
    return 'Yesterday'
  }

  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function daysFromToday(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  const [todayYear, todayMonth, todayDay] = todayISO().split('-').map(Number)
  const target = Date.UTC(year, month - 1, day)
  const today = Date.UTC(todayYear, todayMonth - 1, todayDay)
  return Math.round((target - today) / 86400000)
}