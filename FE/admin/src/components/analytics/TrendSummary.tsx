import { ArrowUpRight, CloudRain, Sparkles, Waves } from "lucide-react"
import Heading from "@/components/ui/Heading"
import type { TrendsMap } from "@/types"

function TrendSummary({
  range,
  trendsData,
}: {
  range: keyof TrendsMap
  trendsData: TrendsMap
}) {
  const data = trendsData[range]
  const totalReports = data.reports.reduce((sum, value) => sum + value, 0)
  const peakRain = Math.max(...data.rain)
  const peakRainIndex = data.rain.indexOf(peakRain)
  const peakReports = Math.max(...data.reports)
  const peakReportsIndex = data.reports.indexOf(peakReports)

  return (
    <section className="panel trend-summary">
      <div className="summary-head">
        <div>
          <Heading className="panel-title">Tóm tắt xu hướng</Heading>
          <p>Đọc nhanh mối tương quan giữa mưa và báo cáo ngập</p>
        </div>
        <span className="summary-range">{range === "24h" ? "24 giờ" : range === "7d" ? "7 ngày" : "30 ngày"}</span>
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
            <span>{data.labels[peakRainIndex]}</span>
          </div>
        </div>
        <div className="summary-tile">
          <span className="tile-icon sun">
            <ArrowUpRight size={17} />
          </span>
          <div>
            <small>Đỉnh báo cáo</small>
            <strong>{peakReports}</strong>
            <span>{data.labels[peakReportsIndex]}</span>
          </div>
        </div>
      </div>
      <div className="trend-insight">
        <Sparkles size={16} />
        <p>{data.insight}</p>
      </div>
    </section>
  )
}

export default TrendSummary
