import { ArrowUpRight, CloudRain, Sparkles, Waves } from "lucide-react"
import Heading from "@/components/ui/Heading"
import type { TrendsMap } from "@/types"

const defaultTrend = {
  labels: ["00:00"],
  reports: [0],
  rain: [0],
  insight: "Chưa có đủ số liệu xu hướng.",
}

function TrendSummary({
  range,
  trendsData,
}: {
  range: keyof TrendsMap
  trendsData: TrendsMap
}) {
  const data = trendsData?.[range] ?? defaultTrend
  const reports =
    Array.isArray(data?.reports) && data.reports.length > 0
      ? data.reports
      : defaultTrend.reports
  const rain =
    Array.isArray(data?.rain) && data.rain.length > 0
      ? data.rain
      : defaultTrend.rain
  const labels =
    Array.isArray(data?.labels) && data.labels.length > 0
      ? data.labels
      : defaultTrend.labels

  const totalReports = reports.reduce((sum, value) => sum + value, 0)
  const peakRain = rain.length > 0 ? Math.max(...rain) : 0
  const peakRainIndex = Math.max(0, rain.indexOf(peakRain))
  const peakReports = reports.length > 0 ? Math.max(...reports) : 0
  const peakReportsIndex = Math.max(0, reports.indexOf(peakReports))

  return (
    <section className="panel trend-summary">
      <div className="summary-head">
        <div>
          <Heading className="panel-title">Tóm tắt xu hướng</Heading>
          <p>Đọc nhanh mối tương quan giữa mưa và báo cáo ngập</p>
        </div>
        <span className="summary-range">
          {range === "24h" ? "24 giờ" : range === "7d" ? "7 ngày" : "30 ngày"}
        </span>
      </div>
      <div className="summary-tiles">
        <div className="summary-tile">
          <span className="tile-icon teal">
            <Waves size={17} />
          </span>
          <div>
            <small>Tổng báo cáo</small>
            <strong>{totalReports}</strong>
          </div>
        </div>
        <div className="summary-tile">
          <span className="tile-icon rain">
            <CloudRain size={17} />
          </span>
          <div>
            <small>Đỉnh lượng mưa</small>
            <strong>{peakRain} mm</strong>
            <span>{labels[peakRainIndex] || "—"}</span>
          </div>
        </div>
        <div className="summary-tile">
          <span className="tile-icon sun">
            <ArrowUpRight size={17} />
          </span>
          <div>
            <small>Đỉnh báo cáo</small>
            <strong>{peakReports}</strong>
            <span>{labels[peakReportsIndex] || "—"}</span>
          </div>
        </div>
      </div>
      <div className="trend-insight">
        <Sparkles size={16} />
        <p>{data?.insight || "Chưa có nhận định xu hướng."}</p>
      </div>
    </section>
  )
}

export default TrendSummary
