import { BellRing, CloudRain, Map, TriangleAlert } from "lucide-react"
import Button from "@/components/ui/Button"
import StatusPill from "@/components/ui/StatusPill"
import WaterGauge from "@/components/ui/WaterGauge"
import type { WeatherSnapshot } from "@/types"

function FloodStatusHero({
  pendingCount,
  activeAlertCount,
  onViewMap,
  onViewAlerts,
  weather,
}: {
  pendingCount: number
  activeAlertCount: number
  onViewMap: () => void
  onViewAlerts: () => void
  weather?: WeatherSnapshot | null
}) {
  const rainValue = weather ? Math.round(weather.currentRainMm) : 0
  const isRaining = rainValue > 0
  const riskLabel = weather?.floodRiskLevel
    ? `Nguy cơ ${weather.floodRiskLevel.toLowerCase()}`
    : isRaining
      ? "Nguy cơ cao"
      : "Nguy cơ thấp"

  return (
    <section className="flood-hero">
      <div className="hero-copy">
        <span className="hero-eyebrow">
          <CloudRain size={16} />
          {weather
            ? `Dữ liệu mô phỏng (${weather.provider}) · Ẩm ${weather.humidityPercent}% · ${weather.weatherCondition || "Thời gian thực"}`
            : "Thời tiết mô phỏng"}
        </span>
        <h2 className="hero-title">
          {isRaining
            ? `Mưa ${rainValue} mm · Hệ thống đang giám sát các điểm ngập`
            : "Thời tiết TP.HCM khô ráo, không phát hiện mưa ngập"}
        </h2>
        <p className="hero-sub">
          {isRaining
            ? "Hệ thống đang theo dõi mực nước tại các tuyến trũng và hành lang ven kênh theo mô phỏng."
            : "Hệ thống AI liên tục giám sát 250 điểm ngập xung yếu và triều cường sông Sài Gòn bằng dữ liệu mô phỏng."}
        </p>
        <div className="hero-actions">
          <Button onClick={onViewMap}>
            <Map size={16} /> Xem trên bản đồ
          </Button>
          <Button variant="secondary" onClick={onViewAlerts}>
            <BellRing size={16} /> Xem cảnh báo
          </Button>
        </div>
        <div className="hero-chips">
          <StatusPill tone="watch" icon={<TriangleAlert size={13} />}>
            {pendingCount} báo cáo chờ xác minh
          </StatusPill>
          <StatusPill tone="danger">
            {activeAlertCount} cảnh báo đang phát
          </StatusPill>
          <StatusPill tone={isRaining ? "watch" : "safe"}>
            {isRaining ? "Đang có mưa" : "Đường khô ráo"}
          </StatusPill>
        </div>
      </div>

      <div className="hero-gauge">
        <div className="hero-rain">
          <span className="hero-rain-icon">
            <CloudRain size={22} />
          </span>
          <div>
            <small>Lượng mưa hiện tại</small>
            <strong>
              {rainValue} <span>mm</span>
            </strong>
          </div>
          <StatusPill tone={isRaining ? "watch" : "safe"}>{riskLabel}</StatusPill>
        </div>
        <WaterGauge label="mm" title="Lượng mưa mô phỏng" tone={isRaining ? 1 : 0} value={rainValue} />
        <p className="hero-gauge-note">
          {isRaining
            ? "Dữ liệu thời tiết mô phỏng, không kết nối trạm đo hoặc dịch vụ bên ngoài."
            : "Lượng mưa duy trì 0 mm, không có nguy cơ ngập úng trên địa bàn TP.HCM."}
        </p>
      </div>
    </section>
  )
}

export default FloodStatusHero
