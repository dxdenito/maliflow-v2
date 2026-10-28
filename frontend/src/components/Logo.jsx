function Logo({ size = 36, showText = true, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="0.5"
          y="0.5"
          width="47"
          height="47"
          rx="12"
          fill="#064E3B"
          stroke="#10B981"
          strokeOpacity="0.35"
        />
        <path
          d="M24 40C24 35 22 31 24 25"
          stroke="#10B981"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path d="M24 29C22 22 28 15 38 15C37 24 32 30 24 29Z" fill="#10B981" />
        <path d="M24 29C26 22 20 15 10 15C11 24 16 30 24 29Z" fill="#10B981" />
        <path d="M24 8C28 12 28 18 24 24C20 18 20 12 24 8Z" fill="#6EE7B7" />
        <path
          d="M25 28C29 24 33 20 36 17"
          stroke="#064E3B"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M23 28C19 24 15 20 12 17"
          stroke="#064E3B"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.6"
        />
      </svg>
      {showText && (
        <span
          className="font-bold leading-none tracking-tight text-ink"
          style={{ fontSize: size * 0.62 }}
        >
          Mali<span className="text-brand">Flow</span>
        </span>
      )}
    </div>
  )
}

export default Logo