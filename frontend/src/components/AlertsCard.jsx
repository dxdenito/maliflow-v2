import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BellRing, ChevronRight } from 'lucide-react'
import { alertLabel, alertTone, fetchAlerts } from '../lib/alerts'
import { formatMoney } from '../lib/format'

function AlertsCard() {
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    let ignore = false

    fetchAlerts()
      .then((data) => {
        if (!ignore) setAlerts(data)
      })
      .catch(() => {})

    return () => {
      ignore = true
    }
  }, [])

  if (alerts.length === 0) {
    return null
  }

  const visible = alerts.slice(0, 3)

  return (
    <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted uppercase">
        <BellRing size={16} className="text-warn" /> Needs attention
      </h2>

      <div className="mt-2 divide-y divide-line">
        {visible.map((alert) => (
          <Link
            key={`${alert.source}-${alert.item_id}`}
            to={alert.source === 'purchase' ? '/purchases' : '/obligations'}
            className="flex items-center gap-3 py-3"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{alert.name}</span>
              <span className={`block text-sm ${alertTone(alert)}`}>
                {alertLabel(alert)}
              </span>
            </span>
            <span className="font-bold">{formatMoney(alert.amount)}</span>
            <ChevronRight size={16} className="text-muted" />
          </Link>
        ))}
      </div>

      {alerts.length > visible.length && (
        <p className="mt-1 text-xs text-muted">
          and {alerts.length - visible.length} more
        </p>
      )}
    </div>
  )
}

export default AlertsCard