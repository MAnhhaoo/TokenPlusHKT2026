function Brand() {
  return (
    <div aria-label="SaigonDrain AI" className="brand">
      <span className="brand-mark">
        <svg aria-hidden="true" fill="none" viewBox="0 0 40 40">
          <path
            d="M7 15.5c3.4-3.1 6.6-3.1 10 0s6.6 3.1 10 0 6.6-3.1 10 0"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2.6"
          />
          <path
            d="M5 22c3.4-3.1 6.6-3.1 10 0s6.6 3.1 10 0 6.6-3.1 10 0"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2.6"
          />
          <path
            d="M9 28.5c3.4-3.1 6.6-3.1 10 0s6.6 3.1 10 0"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2.6"
          />
          <circle cx="31.5" cy="8.5" fill="#F4C95D" r="3.4" />
        </svg>
      </span>
      <span className="brand-word">
        Saigon<span>Drain</span>
      </span>
      <span className="brand-ai">AI</span>
    </div>
  )
}

export default Brand
