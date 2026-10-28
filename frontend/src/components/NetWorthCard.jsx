import { useEffect, useState } from 'react'
import { ChevronDown, Scale } from 'lucide-react'
import { formatMoney } from '../lib/format'
import { fetchNetWorth } from '../lib/networth'

function minus(value) {
  return Number(value) > 0 ? `-${formatMoney(value)}` : formatMoney(0)
}

function Line({ label, value, tone = '' }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className={`font-medium ${tone}`}>{value}</span>
    </div>
  )
}

function NetWorthCard() {
  const [data, setData] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let ignore = false

    fetchNetWorth()
      .then((result) => {
        if (!ignore) setData(result)
      })
      .catch(() => {})

    return () => {
      ignore = true
    }
  }, [])

  if (!data) {
    return null
  }

  const net = Number(data.net_worth)
  const liabilities = Number(data.total_liabilities)

  return (
    <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted uppercase">
        <Scale size={16} className="text-brand" /> Net worth
      </div>
      <p
        className={`mt-2 text-3xl font-bold tracking-tight ${
          net < 0 ? 'text-danger' : ''
        }`}
      >
        {formatMoney(net)}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-app p-3">
          <p className="text-xs text-muted">Assets</p>
          <p className="mt-0.5 font-bold text-brand">
            {formatMoney(data.total_assets)}
          </p>
        </div>
        <div className="rounded-xl bg-app p-3">
          <p className="text-xs text-muted">Liabilities</p>
          <p className={`mt-0.5 font-bold ${liabilities > 0 ? 'text-danger' : ''}`}>
            {formatMoney(data.total_liabilities)}
          </p>
        </div>
      </div>

      <button
        onClick={() => setOpen(!open)}
        className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-brand"
      >
        {open ? 'Hide breakdown' : 'See breakdown'}
        <ChevronDown
          size={16}
          className={`transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          <div className="mt-2 divide-y divide-line">
            <Line label="Available funds" value={formatMoney(data.available)} />
            <Line label="Savings" value={formatMoney(data.savings)} />
            <Line label="Investments" value={formatMoney(data.investments)} />
            <Line label="Things you own" value={formatMoney(data.owned_items)} />
            <Line
              label="Obligations"
              value={minus(data.obligations)}
              tone={Number(data.obligations) > 0 ? 'text-danger' : ''}
            />
            <Line
              label="Financed purchases"
              value={minus(data.purchases)}
              tone={Number(data.purchases) > 0 ? 'text-danger' : ''}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            Investments count at the value you last gave them. A purchase counts
            as something you own only when you mark it as an asset on the
            Purchases page.
          </p>
        </>
      )}
    </div>
  )
}

export default NetWorthCard