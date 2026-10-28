import { formatMoney } from '../lib/format'
import { percentText, shortMonth } from '../lib/reports'

function TrendChart({ points }) {
  const max = Math.max(
    ...points.flatMap((point) => [Number(point.income), Number(point.spent)]),
    1,
  )

  return (
    <div>
      <div className="flex h-36 items-end gap-3">
        {points.map((point) => (
          <div
            key={point.period}
            className="flex h-full flex-1 items-end justify-center gap-1"
          >
            <div
              title={`Income: ${formatMoney(point.income)}`}
              className="w-full max-w-4 rounded-t bg-brand"
              style={{
                height: `${(Number(point.income) / max) * 100}%`,
                minHeight: Number(point.income) > 0 ? 2 : 0,
              }}
            />
            <div
              title={`Spent: ${formatMoney(point.spent)}`}
              className="w-full max-w-4 rounded-t bg-warn"
              style={{
                height: `${(Number(point.spent) / max) * 100}%`,
                minHeight: Number(point.spent) > 0 ? 2 : 0,
              }}
            />
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-3">
        {points.map((point) => (
          <div key={point.period} className="flex-1 text-center">
            <p className="text-xs font-medium">{shortMonth(point.period)}</p>
            <p className="text-[11px] text-muted">
              {percentText(point.savings_rate)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand" /> Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-warn" /> Spent
        </span>
        <span>The number under each month is the share of income saved.</span>
      </div>
    </div>
  )
}

export default TrendChart