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
            ? `Đồng bộ trực tiếp (${weather.provider}) · Ẩm ${weather.humidityPercent}% · ${weather.weatherCondition || "Thời gian thực"}`
            : "Thời gian thực Open-Meteo"}
        </span>
        <h2 className="hero-title">
          {isRaining
            ? `Mưa ${rainValue} mm · Hệ thống đang giám sát các điểm ngập`
            : "Thời tiết TP.HCM khô ráo, không phát hiện mưa ngập"}
        </h2>
        <p className="hero-sub">
          {isRaining
            ? "Hệ thống đang theo dõi mực nước tại các tuyến trũng và hành lang ven kênh theo thời gian thực."
            : "Hệ thống AI liên tục giám sát 250 điểm ngập xung yếu và triều cường sông Sài Gòn theo dữ liệu thời tiết thực tế."}
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
        <WaterGauge tone={isRaining ? 1 : 0} value={rainValue} />
        <p className="hero-gauge-note">
          {isRaining
            ? "Cập nhật tự động từ trạm đo vệ tinh Open-Meteo & mạng lưới cảm biến đô thị."
            : "Lượng mưa duy trì 0 mm, không có nguy cơ ngập úng trên địa bàn TP.HCM."}
        </p>
      </div>
    </section>
  )
}

export default FloodStatusHero
