import { useState } from 'react'
import { Package } from 'lucide-react'
import { getErrorMessage } from '../lib/api'
import { formatMoney, isMoneyInput } from '../lib/format'
import { setAssetValue } from '../lib/purchases'
import { inputClass } from '../lib/styles'

function AssetCard({ purchase, onChanged }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const counted =
    purchase.asset_value !== null && purchase.asset_value !== undefined

  function startEditing() {
    setValue(String(counted ? purchase.asset_value : purchase.price))
    setError('')
    setEditing(true)
  }

  function handleChange(event) {
    if (isMoneyInput(event.target.value)) {
      setValue(event.target.value)
    }
  }

  async function save(nextValue) {
    setError('')
    setBusy(true)
    try {
      await setAssetValue(purchase.id, nextValue)
      setEditing(false)
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function handleSave() {
    if (value === '') {
      setError('Enter what it is worth')
      return
    }
    save(Number(value).toFixed(2))
  }

  return (
    <div className="rounded-2xl bg-app p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Package size={18} />
        </span>
        <div className="min-w-0 flex-1">
          {counted ? (
            <>
              <p className="text-sm text-muted">What it is worth</p>
              <p className="mt-0.5 text-xl font-bold">
                {formatMoney(purchase.asset_value)}
              </p>
              <p className="mt-1 text-xs text-muted">
                Counted as an asset in your net worth
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold">Not counted in your net worth</p>
              <p className="mt-1 text-xs text-muted">
                If you own this, like a car or furniture, count it as an asset
                so your net worth doesn't drop by the whole price.
              </p>
            </>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {editing ? (
        <div className="mt-4 space-y-3">
          <input
            aria-label="What it is worth"
            value={value}
            onChange={handleChange}
            inputMode="decimal"
            placeholder="0.00"
            autoFocus
            className={inputClass}
          />
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleSave}
              disabled={busy}
              className="rounded-xl bg-brand py-2.5 text-sm font-semibold text-on-brand transition hover:brightness-110 active:scale-95 disabled:opacity-60"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-xl border border-line py-2.5 text-sm font-medium transition hover:border-brand active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : counted ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={startEditing}
            className="rounded-xl border border-line py-2.5 text-sm font-medium transition hover:border-brand active:scale-95"
          >
            Update value
          </button>
          <button
            onClick={() => save(null)}
            disabled={busy}
            className="rounded-xl border border-line py-2.5 text-sm font-medium text-muted transition hover:border-danger hover:text-danger active:scale-95 disabled:opacity-60"
          >
            Stop counting
          </button>
        </div>
      ) : (
        <button
          onClick={startEditing}
          className="mt-4 w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-on-brand transition hover:brightness-110 active:scale-95"
        >
          Count it as an asset
        </button>
      )}
    </div>
  )
}

export default AssetCard