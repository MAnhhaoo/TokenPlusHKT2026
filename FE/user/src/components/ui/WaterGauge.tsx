function WaterGauge({
  value,
  max = 60,
  label,
  tone = 0,
  compact = false,
}: {
  value: number
  max?: number
  label?: string
  tone?: 0 | 1 | 2 | number
  compact?: boolean
}) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100))
  const level = tone >= 2 ? "danger" : tone === 1 ? "watch" : "safe"

  return (
    <div
      aria-label={label ? `${label}: ${value} trên ${max}` : undefined}
      aria-valuemax={max}
      aria-valuemin={0}
      aria-valuenow={value}
      className={`water-gauge ${compact ? "is-compact" : ""} level-${level}`}
      role="meter"
    >
      {!compact && (
        <div className="gauge-head">
          <span>Mức nước</span>
          <strong>
            {value}
            <small>{label ?? "cm"}</small>
          </strong>
        </div>
      )}
      <div className="gauge-track">
        <span className="gauge-zone safe" />
        <span className="gauge-zone watch" />
        <span className="gauge-zone danger" />
        <span
          className="gauge-fill"
          style={{ transform: `scaleX(${percent / 100})` }}
        />
        <span
          aria-hidden="true"
          className="gauge-needle"
          style={{ left: `${percent}%` }}
        />
      </div>
      {compact ? (
        <span className="gauge-inline-label">
          {value}/{max} {label}
        </span>
      ) : (
        <div className="gauge-scale" aria-hidden="true">
          <span>0</span>
          <span>{Math.round(max / 4)}</span>
          <span>{Math.round(max / 2)}</span>
          <span>{Math.round((max * 3) / 4)}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  )
}

export default WaterGauge
