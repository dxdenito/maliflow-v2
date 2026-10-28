import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bell, CheckCircle2 } from 'lucide-react'
import Modal from './Modal'
import { alertLabel, alertTone, fetchAlerts } from '../lib/alerts'
import { formatMoney } from '../lib/format'

function NotificationBell() {
  const [alerts, setAlerts] = useState([])
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

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
  }, [pathname, open])

  const close = useCallback(() => setOpen(false), [])
  const hasOverdue = alerts.some((alert) => alert.kind === 'overdue')

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Alerts"
        className="relative rounded-lg border border-line bg-surface p-2 text-muted transition hover:text-ink"
      >
        <Bell size={18} />
        {alerts.length > 0 && (
          <span
            className={`absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${
              hasOverdue ? 'bg-danger text-white' : 'bg-warn text-slate-900'
            }`}
          >
            {alerts.length}
          </span>
        )}
      </button>

      {open && (
        <Modal title="Alerts" onClose={close}>
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <CheckCircle2 size={26} />
              </span>
              <p className="mt-3 font-semibold">You're all caught up</p>
              <p className="mt-1 text-sm text-muted">
                Nothing is due in the next few days.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {alerts.map((alert) => (
                <Link
                  key={`${alert.source}-${alert.item_id}`}
                  to={alert.source === 'purchase' ? '/purchases' : '/obligations'}
                  onClick={close}
                  className="flex items-center gap-3 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {alert.name}
                    </span>
                    <span className={`block text-sm ${alertTone(alert)}`}>
                      {alertLabel(alert)}
                    </span>
                  </span>
                  <span className="font-bold">{formatMoney(alert.amount)}</span>
                </Link>
              ))}
            </div>
          )}
        </Modal>
      )}
    </>
  )
}

export default NotificationBell