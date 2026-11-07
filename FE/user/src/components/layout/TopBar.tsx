import { useEffect, useState } from "react"
import Brand from "@/components/layout/Brand"
import Icon from "@/components/ui/Icon"
import type { CommunityUserProfile, WeatherSnapshot } from "@/types"

function formatVietnamClock(date = new Date()): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)
}

function TopBar({
  weather,
  onSyncWeather,
  currentUser,
  onOpenAuth,
  alertCount = 0,
  onOpenAlerts,
  onOpenGuide,
  activeMainTab = "map",
  onSelectMainTab,
}: {
  weather?: WeatherSnapshot | null
  onSyncWeather?: () => void
  currentUser?: CommunityUserProfile | null
  onOpenAuth?: () => void
  alertCount?: number
  onOpenAlerts?: () => void
  onOpenGuide?: () => void
  activeMainTab?: "map" | "weather"
  onSelectMainTab?: (tab: "map" | "weather") => void
}) {
  const [vnTime, setVnTime] = useState(() => formatVietnamClock())

  useEffect(() => {
    const timer = window.setInterval(() => {
      setVnTime(formatVietnamClock())
    }, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const weatherLabel = weather
    ? `${weather.weatherCondition} · ${Math.round(weather.temperatureC)}°C`
    : "Nắng ráo · 31°C"

  return (
    <header className={`top-bar ${activeMainTab === "weather" ? "in-weather-mode" : ""}`}>
      <div className="top-bar-left">
        <Brand />
      </div>

      {/* Main Tab Switcher in Center matching screenshot */}
      <nav aria-label="Chuyển chế độ xem" className="top-nav-switcher">
        <button
          aria-current={activeMainTab === "map" ? "page" : undefined}
          className={`top-nav-pill ${activeMainTab === "map" ? "is-active" : ""}`}
          onClick={() => onSelectMainTab?.("map")}
          type="button"
        >
          <Icon name="map" size={17} />
          <span>Bản đồ an toàn</span>
        </button>
        <button
          aria-current={activeMainTab === "weather" ? "page" : undefined}
          className={`top-nav-pill ${activeMainTab === "weather" ? "is-active" : ""}`}
          onClick={() => onSelectMainTab?.("weather")}
          type="button"
        >
          <Icon name="rain" size={17} />
          <span>Thời tiết</span>
        </button>
      </nav>

      {/* Right Actions */}
      <div className="top-bar-actions">
        {activeMainTab === "map" && (
          <button
            aria-label="Cập nhật thời tiết thực tế từ Open-Meteo"
            className="weather-chip"
            onClick={onSyncWeather}
            title="Nhấn để đồng bộ thời tiết thực tế (Open-Meteo API)"
            type="button"
          >
            <Icon
              name={
                weather?.weatherCondition?.toLowerCase().includes("mưa") ||
                (weather?.currentRainMm ?? 0) > 0
                  ? "rain"
                  : "sun"
              }
              size={16}
            />
            <span className="weather-chip-text">{weatherLabel}</span>
          </button>
        )}

        <button
          aria-label="Hướng dẫn di chuyển an toàn mùa ngập"
          className="icon-button header-action"
          onClick={onOpenGuide}
          title="Cẩm nang di chuyển an toàn mùa mưa ngập"
          type="button"
        >
          <Icon name="help" size={20} />
        </button>

        <button
          aria-label={`Cảnh báo khu vực, có ${alertCount} cảnh báo đang hiệu lực`}
          className={`icon-button header-action ${alertCount > 0 ? "has-dot" : ""}`}
          onClick={onOpenAlerts}
          title={`Xem ${alertCount} cảnh báo khu vực từ Trung tâm điều hành`}
          type="button"
        >
          <Icon name="bell" size={20} />
          {alertCount > 0 && (
            <span aria-hidden="true" className="notification-dot" />
          )}
        </button>

        <button
          aria-label={
            currentUser
              ? `Tài khoản ${currentUser.name}`
              : "Đăng nhập hoặc Đăng ký tài khoản"
          }
          className={`user-button ${currentUser ? "is-logged-in" : "is-guest"}`}
          onClick={onOpenAuth}
          title={
            currentUser
              ? `${currentUser.name} (${currentUser.district})`
              : "Nhấn để Đăng nhập / Đăng ký"
          }
          type="button"
        >
          {currentUser ? (
            <>
              <span className="user-chip-initials">{currentUser.initials}</span>
              <span className="user-chip-name">{currentUser.name}</span>
            </>
          ) : (
            <>
              <Icon name="user" size={17} />
              <span className="user-chip-name">Đăng nhập</span>
            </>
          )}
        </button>
      </div>
    </header>
  )
}

export default TopBar
