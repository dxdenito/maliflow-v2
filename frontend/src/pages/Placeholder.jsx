import { Construction } from 'lucide-react'

function Placeholder({ title, description }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-muted">{description}</p>

      <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Construction size={26} />
        </div>
        <p className="mt-4 font-semibold">Coming soon</p>
        <p className="mt-1 max-w-xs text-sm text-muted">
          This section is on its way.
        </p>
      </div>
    </div>
  )
}

export default Placeholder