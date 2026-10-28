import { useState } from 'react'
import { Archive, Loader2 } from 'lucide-react'
import Choice from './Choice'
import Modal from './Modal'
import { accountTypes } from '../config/accountTypes'
import { createAccount, updateAccount } from '../lib/accounts'
import { getErrorMessage } from '../lib/api'
import { inputClass } from '../lib/styles'

const pools = [
  { value: 'available', label: 'Available', hint: 'Money you can spend' },
  { value: 'savings', label: 'Savings', hint: 'Money set aside' },
]


function AccountModal({ account, onClose, onSaved }) {
  const isEdit = Boolean(account)
  const [name, setName] = useState(account?.name ?? '')
  const [accountType, setAccountType] = useState(account?.account_type ?? 'cash')
  const [pool, setPool] = useState('available')
  const [openingBalance, setOpeningBalance] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleBalanceChange(event) {
    const value = event.target.value
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setOpeningBalance(value)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (isEdit) {
        await updateAccount(account.id, {
          name: name.trim(),
          account_type: accountType,
        })
      } else {
        await createAccount({
          name: name.trim(),
          account_type: accountType,
          pool,
          opening_balance: openingBalance || '0',
        })
      }
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  async function handleArchive() {
    setError('')
    setSubmitting(true)
    try {
      await updateAccount(account.id, { is_active: false })
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Edit account' : 'New account'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="account-name"
            className="mb-1.5 block text-sm font-medium text-muted"
          >
            Name
          </label>
          <input
            id="account-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cash, Mobile wallet"
            maxLength={100}
            required
            className={inputClass}
          />
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-muted">Type</p>
          <div className="grid grid-cols-2 gap-2">
            {accountTypes.map((type) => (
              <Choice
                key={type.value}
                active={accountType === type.value}
                onClick={() => setAccountType(type.value)}
              >
                <span className="flex items-center gap-2">
                  <type.icon size={16} /> {type.label}
                </span>
              </Choice>
            ))}
          </div>
        </div>

        {!isEdit && (
          <>
            <div>
              <p className="mb-1.5 text-sm font-medium text-muted">Pool</p>
              <div className="grid grid-cols-2 gap-2">
                {pools.map((item) => (
                  <Choice
                    key={item.value}
                    active={pool === item.value}
                    onClick={() => setPool(item.value)}
                  >
                    <span className="block">{item.label}</span>
                    <span className="block text-xs font-normal opacity-70">
                      {item.hint}
                    </span>
                  </Choice>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="opening-balance"
                className="mb-1.5 block text-sm font-medium text-muted"
              >
                Opening balance (optional)
              </label>
              <input
                id="opening-balance"
                value={openingBalance}
                onChange={handleBalanceChange}
                inputMode="decimal"
                placeholder="0.00"
                className={inputClass}
              />
              <p className="mt-1.5 text-xs text-muted">
                Money already in this account today. It is not counted as income.
              </p>
            </div>
          </>
        )}

        {isEdit && (
          <p className="text-xs text-muted">
            The pool ({account.pool}) can't be changed after an account is created.
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-brand transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
        >
          {submitting && <Loader2 size={18} className="animate-spin" />}
          {isEdit ? 'Save changes' : 'Create account'}
        </button>

        {isEdit && (
          <button
            type="button"
            onClick={handleArchive}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-3 font-medium text-muted transition hover:border-danger hover:text-danger disabled:opacity-60"
          >
            <Archive size={16} /> Archive account
          </button>
        )}
      </form>
    </Modal>
  )
}

export default AccountModal