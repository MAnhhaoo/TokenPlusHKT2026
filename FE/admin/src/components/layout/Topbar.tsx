import { useEffect, useState } from "react"
import { CloudRain, Droplets, Menu } from "lucide-react"
import Button from "@/components/ui/Button"
import Heading from "@/components/ui/Heading"
import IconButton from "@/components/ui/IconButton"
import type { Page, WeatherSnapshot } from "@/types"

function getVietnamDateTimeSubtitle(nowDate = new Date()): string {
  const weekdayAndDate = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(nowDate)

  const timeHm = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(nowDate)

  const capitalized =
    weekdayAndDate.charAt(0).toUpperCase() + weekdayAndDate.slice(1)
  return `${capitalized} · Giờ Việt Nam ${timeHm} (GMT+7)`
}

const pageMeta: Record<
  Page,
  { eyebrow: string; title: string; subtitle: string; live?: boolean }
> = {
  overview: {
    eyebrow: "Giám sát thời gian thực",
    title: "Tổng quan điều hành",
    subtitle: "",
    live: true,
  },
  map: {
    eyebrow: "Bản đồ vận hành",
    title: "Bản đồ ngập TP.HCM",
    subtitle: "Lớp dữ liệu ngập hiện tại, nguy cơ, mưa dự báo và lịch sử",
  },
  reports: {
    eyebrow: "Dữ liệu cộng đồng",
    title: "Báo cáo hiện trường",
    subtitle: "Hàng chờ xác minh, bộ lọc chất lượng và trạng thái xử lý",
  },
  users: {
    eyebrow: "Dữ liệu cộng đồng",
    title: "Quản lý người dùng",
    subtitle: "Hồ sơ, quyền truy cập và chất lượng đóng góp cộng đồng",
  },
  analytics: {
    eyebrow: "Phân tích dữ liệu",
    title: "Xu hướng mưa và báo cáo",
    subtitle: "Tương quan lượng mưa, mức độ ngập và đóng góp cộng đồng",
  },
}

function Topbar({
  page,
  onOpenMenu,
  onViewReports,
  onExportUsers,
  weather,
  onSyncWeather,
}: {
  page: Page
  onOpenMenu: () => void
  onViewReports?: () => void
  onExportUsers: () => void
  weather?: WeatherSnapshot | null
  onSyncWeather?: () => void
}) {
  const [vnSubtitle, setVnSubtitle] = useState(() =>
    getVietnamDateTimeSubtitle(),
  )

  useEffect(() => {
    const timer = window.setInterval(() => {
      setVnSubtitle(getVietnamDateTimeSubtitle())
    }, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const meta = pageMeta[page]
  const weatherSummary = weather
    ? `${weather.weatherCondition} · ${Math.round(weather.temperatureC)}°C`
    : "Mưa lớn · 27°C"

  return (
    <header className="topbar">
      <div className="topbar-left">
        <IconButton
          label="Mở menu"
          className="menu-button"
          onClick={onOpenMenu}
        >
          <Menu size={20} />
        </IconButton>
        <div>
          <div className="page-eyebrow">Trung tâm điều hành</div>
          <div className="page-title-row">
            <Heading level={1} className="page-title">
              {meta.title}
            </Heading>
            {meta.live && (
              <span className="live-badge">
                <i /> LIVE
              </span>
            )}
          </div>
          <p>{page === "overview" ? vnSubtitle : meta.subtitle}</p>
        </div>
      </div>
      <div className="topbar-actions">
        <div
          className="weather-chip"
          onClick={onSyncWeather}
          role={onSyncWeather ? "button" : undefined}
          style={onSyncWeather ? { cursor: "pointer" } : undefined}
          title="Nhấn để đồng bộ thời tiết thực tế từ Open-Meteo API"
        >
          <CloudRain size={18} />
          <span>
            <small>{weather?.locationName || "TP. Hồ Chí Minh"}</small>
            <b>{weatherSummary}</b>
          </span>
        </div>
        {page === "overview" && onViewReports ? (
          <Button aria-label="Báo cáo cộng đồng" onClick={onViewReports}>
            <Droplets size={16} /> <span>Báo cáo cộng đồng</span>
          </Button>
        ) : null}
      </div>
    </header>
  )
}

export default Topbar
