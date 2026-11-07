import { Sparkles } from "lucide-react"
import Heading from "@/components/ui/Heading"
import type { TrendsMap } from "@/types"

const defaultTrend = {
  labels: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"],
  reports: [0, 0, 0, 0, 0, 0],
  rain: [0, 0, 0, 0, 0, 0],
  insight: "Đang tải hoặc chưa có dữ liệu chuỗi thời gian cho khung giờ này.",
}

function TrendChart({
  range,
  setRange,
  trendsData,
}: {
  range: keyof TrendsMap
  setRange: (range: keyof TrendsMap) => void
  trendsData: TrendsMap
}) {
  const data = trendsData?.[range] ?? defaultTrend
  const rawLabels =
    Array.isArray(data?.labels) && data.labels.length > 0
      ? data.labels
      : defaultTrend.labels
  const rawReports =
    Array.isArray(data?.reports) && data.reports.length > 0
      ? data.reports
      : defaultTrend.reports
  const rawRain =
    Array.isArray(data?.rain) && data.rain.length > 0
      ? data.rain
      : defaultTrend.rain

  const labels = rawLabels.filter(
    (label) => typeof label === "string" && label.trim(),
  )
  const safeLabels = labels.length > 0 ? labels : ["00:00"]
  const reports = rawReports.slice(0, safeLabels.length)
  const rain = rawRain.slice(0, safeLabels.length)

  const max = Math.max(...reports, ...rain, 1)
  const step = safeLabels.length > 1 ? 676 / (safeLabels.length - 1) : 0
  const y = (value: number) => 140 - (value / max) * 116
  const reportPoints = reports
    .map((v, i) => `${12 + i * step},${y(v)}`)
    .join(" ")
  const rainPoints = rain
    .map((v, i) => `${12 + i * step},${y(v)}`)
    .join(" ")

  return (
    <section className="panel trend-panel">
      <div className="panel-heading">
        <div>
          <Heading className="panel-title">Diễn biến theo thời gian</Heading>
          <p>Tương quan lượng mưa và báo cáo cộng đồng</p>
        </div>
        <div
          className="segmented"
          role="group"
          aria-label="Khoảng thời gian biểu đồ"
        >
          {(["24h", "7d", "30d"] as const).map((item) => (
            <button
              aria-pressed={range === item}
              key={item}
              className={range === item ? "selected" : ""}
              onClick={() => setRange(item)}
              type="button"
            >
              {item === "24h"
                ? "24 giờ"
                : item === "7d"
                  ? "7 ngày"
                  : "30 ngày"}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-wrap">
        <svg
          viewBox="0 0 700 160"
          role="img"
          aria-label="Biểu đồ báo cáo và lượng mưa"
        >
          {[24, 53, 82, 111].map((gridY) => (
            <line
              key={gridY}
              x1="12"
              y1={gridY}
              x2="688"
              y2={gridY}
              className="chart-grid"
            />
          ))}
          <path
            d={`M12 140 L${reportPoints} L${12 + step * (reports.length - 1)} 140 Z`}
            className="reports-area"
          />
          <polyline
            points={reportPoints}
            className="reports-line"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={rainPoints}
            className="rain-line"
            fill="none"
            strokeWidth="2.2"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />
          {reports.map((value, index) => (
            <g key={`${safeLabels[index]}-${index}`} className="chart-point">
              <circle cx={12 + index * step} cy={y(value)} r="3.5" />
              <title>{`${safeLabels[index]}: ${value} báo cáo`}</title>
            </g>
          ))}
        </svg>
        <div className="chart-labels">
          {safeLabels.map((label, i) => (
            <span key={`${label}-${i}`}>{label}</span>
          ))}
        </div>
      </div>
      <div className="chart-footer">
        <div className="legend-item">
          <span className="legend-line reports" /> Báo cáo
        </div>
        <div className="legend-item">
          <span className="legend-line rain" /> Lượng mưa
        </div>
        <div className="insight">
          <Sparkles size={14} />{" "}
          {data?.insight ||
            "Dữ liệu trực quan hóa từ mô hình quan trắc lượng mưa và báo cáo cộng đồng."}
        </div>
      </div>
    </section>
  )
}

export default TrendChart
