function Choice({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${
        active
          ? 'border-brand bg-brand/10 text-brand'
          : 'border-line text-muted hover:border-brand/50'
      }`}
    >
      {children}
    </button>
  )
}

export default Choice