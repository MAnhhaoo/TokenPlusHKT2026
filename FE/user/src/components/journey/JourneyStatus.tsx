import Icon from "@/components/ui/Icon"
import WaterGauge from "@/components/ui/WaterGauge"
import type { ForecastSlot, WeatherSnapshot } from "@/types"

function JourneyStatus({
  forecastIndex,
  slots,
  weather,
}: {
  forecastIndex: number
  slots: readonly ForecastSlot[]
  weather?: WeatherSnapshot | null
}) {
  const forecast =
    slots[forecastIndex] ??
    slots[0] ?? {
      id: "now",
      label: "Hiện tại",
      rain: "0 mm",
      risk: "Thấp",
      zone: 0 as const,
    }

  const rainValue = Number.parseInt(forecast.rain, 10) || 0
  const isHighRisk = forecast.zone >= 2
  const isWarning = forecast.zone === 1
  const isRaining = rainValue > 0 || isHighRisk || isWarning
  const temp = weather ? Math.round(weather.temperatureC) : 31
  const condition = weather?.weatherCondition || "Trời nắng ráo"

  const statusTitle = isHighRisk
    ? "Nên chờ mưa giảm trước khi đi"
    : isWarning
      ? "Có thể đi, cần theo dõi cảnh báo"
      : "Có thể di chuyển an toàn"

  return (
    <div
      className={`journey-summary ${
        isHighRisk
          ? "is-danger"
          : isWarning
            ? "is-warning"
            : isRaining
              ? ""
              : "is-sunny-safe"
      }`}
    >
      <span className={`summary-icon ${!isRaining ? "is-sunny" : ""}`}>
        <Icon
          name={isHighRisk ? "alert" : isWarning || isRaining ? "rain" : "shield"}
          size={23}
        />
      </span>
      <div className="summary-copy">
        <strong>{statusTitle}</strong>
        {isRaining ? (
          <p>
            {forecast.label} · {forecast.rain} mưa · nguy cơ{" "}
            {forecast.risk.toLowerCase()}
          </p>
        ) : (
          <p>
            {forecast.label} · {temp}°C · {condition}, không có nguy cơ ngập
          </p>
        )}
      </div>

      {isRaining ? (
        <div className="summary-gauge">
          <WaterGauge
            compact
            label="mm mưa"
            max={60}
            tone={forecast.zone}
            value={rainValue}
          />
        </div>
      ) : (
        <div className="summary-dry-badge" title="Tuyến đường khô ráo, không có mưa ngập">
          <span className="summary-dry-dot" />
          <span>Đường khô ráo</span>
        </div>
      )}
    </div>
  )
}

export default JourneyStatus
