import { type ReactNode } from "react"

function MetricCard({
  icon,
  tone,
  value,
  label,
  meta,
  data,
}: {
  icon: ReactNode
  tone: string
  value: number
  label: string
  meta: ReactNode
  data: number[]
}) {
  const max = Math.max(...data)
  const points = data
    .map((v, i) => `${i * (92 / (data.length - 1)) + 4},${38 - (v / max) * 26}`)
    .join(" ")
  return (
    <section className="metric-card">
      <div className="metric-top">
        <span className={`metric-icon ${tone}`}>{icon}</span>
        <span className="metric-kicker">Hôm nay</span>
      </div>
      <div className="metric-body">
        <div>
          <strong className="metric-value">{value}</strong>
          <p>{label}</p>
        </div>
        <svg
          viewBox="0 0 100 44"
          className={`sparkline ${tone}`}
          aria-hidden="true"
        >
          <path d={`M4 38 L${points} L96 42 L4 42 Z`} className="spark-fill" />
          <polyline
            points={points}
            fill="none"
            className="spark-stroke"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="metric-meta">{meta}</div>
    </section>
  )
}


export default MetricCard
