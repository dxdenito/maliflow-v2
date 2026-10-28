import { formatMoney } from '../lib/format'

function DailyChart({ daily, budget }) {
  if (daily.length === 0) {
    return null
  }

  const totals = daily.map((item) => Number(item.total))
  const limit = budget === null || budget === undefined ? null : Number(budget)
  const max = Math.max(...totals, limit ?? 0, 1)

  return (
    <div>
      <div className="relative flex h-32 items-end gap-0.5">
        {daily.map((item, index) => {
          const total = totals[index]
          const over = limit !== null && total > limit

          return (
            <div
              key={item.day}
              title={`Day ${item.day}: ${formatMoney(total)}`}
              className="flex h-full flex-1 items-end"
            >
              <div
                className={`w-full rounded-t ${over ? 'bg-danger' : 'bg-brand'}`}
                style={{
                  height: `${(total / max) * 100}%`,
                  minHeight: total > 0 ? 2 : 0,
                }}
              />
            </div>
          )
        })}

        {limit !== null && (
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-warn"
            style={{ bottom: `${(limit / max) * 100}%` }}
          />
        )}
      </div>

      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>1</span>
        <span>{daily[daily.length - 1].day}</span>
      </div>

      {limit !== null && (
        <p className="mt-2 text-xs text-muted">
          The dashed line is your starting daily budget of {formatMoney(limit)}.
          Days over it are red.
        </p>
      )}
    </div>
  )
}

export default DailyChart