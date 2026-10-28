import { useCallback, useEffect, useState } from 'react'
import { ChevronRight, Loader2, Plus, Wallet } from 'lucide-react'
import AccountModal from '../components/AccountModal'
import { accountTypeMap } from '../config/accountTypes'
import { fetchAccounts, fetchAccountSummary } from '../lib/accounts'
import { getErrorMessage } from '../lib/api'
import { formatMoney } from '../lib/format'

function AccountRow({ account, onClick }) {
  const type = accountTypeMap[account.account_type] ?? accountTypeMap.other

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-brand/50 active:scale-[0.99]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <type.icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{account.name}</span>
        <span className="block text-sm text-muted">{type.label}</span>
      </span>
      <span className="font-bold">{formatMoney(account.balance)}</span>
      <ChevronRight size={16} className="text-muted" />
    </button>
  )
}

function AccountGroup({ title, accounts, onSelect }) {
  if (accounts.length === 0) {
    return null
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">
        {title}
      </h2>
      <div className="space-y-3">
        {accounts.map((account) => (
          <AccountRow
            key={account.id}
            account={account}
            onClick={() => onSelect(account)}
          />
        ))}
      </div>
    </section>
  )
}

function Accounts() {
  const [accounts, setAccounts] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)

  const load = useCallback(async () => {
    try {
      const [accountList, accountSummary] = await Promise.all([
        fetchAccounts(),
        fetchAccountSummary(),
      ])
      setAccounts(accountList)
      setSummary(accountSummary)
      setError('')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function handleSaved() {
    setModal(null)
    load()
  }

  const closeModal = useCallback(() => setModal(null), [])

  const spendable = accounts.filter((account) => account.pool === 'available')
  const saved = accounts.filter((account) => account.pool === 'savings')

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="mt-1 text-muted">Where your money lives</p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand transition hover:brightness-110 active:scale-95"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-brand" />
        </div>
      )}

      {!loading && summary && (
        <div className="relative mt-6 overflow-hidden rounded-3xl bg-linear-to-br from-brand-dark to-slate-900 p-6 text-slate-50">
          <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-brand/25 blur-3xl" />
          <div className="relative">
            <p className="text-sm text-emerald-200/80">Total across accounts</p>
            <p className="mt-2 text-4xl font-bold tracking-tight">
              {formatMoney(summary.total)}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-xs text-emerald-200/70">Available</p>
                <p className="mt-0.5 font-semibold">
                  {formatMoney(summary.available)}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-xs text-emerald-200/70">Savings</p>
                <p className="mt-0.5 font-semibold">
                  {formatMoney(summary.savings)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && accounts.length === 0 && (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Wallet size={26} />
          </div>
          <p className="mt-4 font-semibold">No accounts yet</p>
          <p className="mt-1 max-w-xs text-sm text-muted">
            Add the places you keep money, like cash, a bank or a mobile wallet.
          </p>
          <button
            onClick={() => setModal('new')}
            className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition hover:brightness-110"
          >
            Add your first account
          </button>
        </div>
      )}

      {!loading && (
        <>
          <AccountGroup title="Available" accounts={spendable} onSelect={setModal} />
          <AccountGroup title="Savings" accounts={saved} onSelect={setModal} />
        </>
      )}

      {modal && (
        <AccountModal
          account={modal === 'new' ? null : modal}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

export default Accounts