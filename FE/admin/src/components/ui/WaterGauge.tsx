function WaterGauge({
  value,
  max = 60,
  label = "cm",
  tone = 0,
}: {
  value: number
  max?: number
  label?: string
  tone?: number
}) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100))
  const level = tone >= 2 ? "danger" : tone === 1 ? "watch" : "safe"

  return (
    <div
      aria-label={`Mực nước ${value} trên ${max} ${label}`}
      aria-valuemax={max}
      aria-valuemin={0}
      aria-valuenow={value}
      className={`water-gauge level-${level}`}
      role="meter"
    >
      <div className="gauge-head">
        <span>Mực nước hiện tại</span>
        <strong>
          {value}
          <small>{label}</small>
        </strong>
      </div>
      <div className="gauge-track">
        <span className="gauge-zone safe" />
        <span className="gauge-zone watch" />
        <span className="gauge-zone danger" />
        <span className="gauge-fill" style={{ width: `${percent}%` }} />
        <span
          aria-hidden="true"
          className="gauge-needle"
          style={{ left: `${percent}%` }}
        />
      </div>
      <div className="gauge-scale" aria-hidden="true">
        <span>0</span>
        <span>10</span>
        <span>20</span>
        <span>30</span>
        <span>40</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

export default WaterGauge
