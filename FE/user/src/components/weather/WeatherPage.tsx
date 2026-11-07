import { useEffect, useRef, useState } from "react"
import { getUserLocation } from "@/lib/location"
import { reverseGeocodeApi } from "@/lib/api"
import {
  DEFAULT_HCMC_WEATHER,
  type DetailedWeatherData,
  fetchFullRealWeather,
  searchWeatherLocation,
} from "@/lib/weatherApi"

function WeatherIllustration({
  theme,
  weatherCode,
  size = 180,
}: {
  theme: "sunny" | "rainy" | "cloudy" | "night"
  weatherCode: number
  size?: number
}) {
  if (theme === "rainy" || weatherCode >= 51) {
    return (
      <div
        className="weather-hero-art rainy"
        style={{ width: size, height: size }}
      >
        <svg
          fill="none"
          height="100%"
          viewBox="0 0 200 200"
          width="100%"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="cloudGrad" x1="20" x2="160" y1="40" y2="140">
              <stop offset="0%" stopColor="#7E9EB8" />
              <stop offset="100%" stopColor="#415C76" />
            </linearGradient>
            <linearGradient id="cloudHighlight" x1="40" x2="40" y1="30" y2="90">
              <stop offset="0%" stopColor="#B3CFE8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#7E9EB8" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="rainGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#7EE6FE" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
            <filter id="cloudShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#0F2B48" floodOpacity="0.35" />
            </filter>
          </defs>
          {/* Main Rain Cloud */}
          <g filter="url(#cloudShadow)">
            <path
              d="M65 130 h70 a35 35 0 0 0 10 -68 a45 45 0 0 0 -80 -14 a36 36 0 0 0 -35 37 a35 35 0 0 0 35 45 z"
              fill="url(#cloudGrad)"
            />
            <path
              d="M65 126 h68 a32 32 0 0 0 8 -62 a42 42 0 0 0 -74 -12 a33 33 0 0 0 -32 34 a32 32 0 0 0 30 40 z"
              fill="url(#cloudHighlight)"
            />
          </g>
          {/* Rain drops with gentle slant */}
          <line className="rain-drop drop-1" stroke="url(#rainGrad)" strokeLinecap="round" strokeWidth="5" x1="55" x2="45" y1="145" y2="175" />
          <line className="rain-drop drop-2" stroke="url(#rainGrad)" strokeLinecap="round" strokeWidth="5" x1="85" x2="75" y1="145" y2="175" />
          <line className="rain-drop drop-3" stroke="url(#rainGrad)" strokeLinecap="round" strokeWidth="5" x1="115" x2="105" y1="145" y2="175" />
          <line className="rain-drop drop-4" stroke="url(#rainGrad)" strokeLinecap="round" strokeWidth="5" x1="145" x2="135" y1="145" y2="175" />
        </svg>
      </div>
    )
  }

  if (theme === "night") {
    return (
      <div
        className="weather-hero-art night"
        style={{ width: size, height: size }}
      >
        <svg
          fill="none"
          height="100%"
          viewBox="0 0 200 200"
          width="100%"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="moonGrad" x1="50" x2="150" y1="30" y2="150">
              <stop offset="0%" stopColor="#FFF4D0" />
              <stop offset="100%" stopColor="#F9D776" />
            </linearGradient>
            <filter id="moonGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="18" floodColor="#FDE68A" floodOpacity="0.45" />
            </filter>
          </defs>
          <g filter="url(#moonGlow)">
            <path
              d="M135 45 A60 60 0 1 0 135 155 A45 45 0 0 1 135 45 Z"
              fill="url(#moonGrad)"
            />
          </g>
          {/* Stars */}
          <circle cx="155" cy="55" fill="#FFF9D2" r="3" />
          <circle cx="170" cy="95" fill="#FFF9D2" r="2.5" />
          <circle cx="45" cy="65" fill="#FFF9D2" r="2" />
        </svg>
      </div>
    )
  }

  // Sunny / Fair weather (Matches user's Image 1 illustration)
  return (
    <div
      className="weather-hero-art sunny"
      style={{ width: size, height: size }}
    >
      <svg
        fill="none"
        height="100%"
        viewBox="0 0 200 200"
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="sunGrad" x1="40" x2="130" y1="40" y2="130">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <linearGradient id="sunCloudGrad" x1="60" x2="170" y1="80" y2="160">
            <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#FDE68A" stopOpacity="0.88" />
          </linearGradient>
          <filter id="sunGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="0" stdDeviation="22" floodColor="#F59E0B" floodOpacity="0.45" />
          </filter>
        </defs>
        {/* Sun Rays & Body */}
        <g filter="url(#sunGlow)">
          <circle cx="95" cy="85" fill="url(#sunGrad)" r="40" />
          {/* Rays */}
          <line stroke="#FBBF24" strokeLinecap="round" strokeWidth="6" x1="95" x2="95" y1="28" y2="38" />
          <line stroke="#FBBF24" strokeLinecap="round" strokeWidth="6" x1="95" x2="95" y1="132" y2="142" />
          <line stroke="#FBBF24" strokeLinecap="round" strokeWidth="6" x1="38" x2="48" y1="85" y2="85" />
          <line stroke="#FBBF24" strokeLinecap="round" strokeWidth="6" x1="142" x2="152" y1="85" y2="85" />
          <line stroke="#FBBF24" strokeLinecap="round" strokeWidth="5" x1="55" x2="63" y1="45" y2="53" />
          <line stroke="#FBBF24" strokeLinecap="round" strokeWidth="5" x1="127" x2="135" y1="117" y2="125" />
          <line stroke="#FBBF24" strokeLinecap="round" strokeWidth="5" x1="135" x2="127" y1="45" y2="53" />
          <line stroke="#FBBF24" strokeLinecap="round" strokeWidth="5" x1="63" x2="55" y1="117" y2="125" />
        </g>
        {/* Soft Front Cloud matching image 1 */}
        <path
          d="M85 142 h60 a28 28 0 0 0 5 -55 a36 36 0 0 0 -64 -10 a28 28 0 0 0 -28 30 a28 28 0 0 0 27 35 z"
          fill="url(#sunCloudGrad)"
        />
      </svg>
    </div>
  )
}

function WeatherSmallIcon({
  code,
  isRain,
  size = 28,
}: {
  code: number
  isRain?: boolean
  size?: number
}) {
  if (isRain || code >= 51) {
    return (
      <svg
        fill="none"
        height={size}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M6 13a4 4 0 0 1 .5 -7.9A5.5 5.5 0 0 1 17 7.5a3.5 3.5 0 0 1-.5 6.9z"
          fill="#94A3B8"
        />
        <line stroke="#38BDF8" strokeLinecap="round" strokeWidth="2" x1="8" x2="7" y1="16" y2="19" />
        <line stroke="#38BDF8" strokeLinecap="round" strokeWidth="2" x1="12" x2="11" y1="16" y2="19" />
        <line stroke="#38BDF8" strokeLinecap="round" strokeWidth="2" x1="16" x2="15" y1="16" y2="19" />
      </svg>
    )
  }
  if (code >= 2) {
    return (
      <svg
        fill="none"
        height={size}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="10" cy="9" fill="#FBBF24" r="4" />
        <path
          d="M8 17h8a4 4 0 0 0 .5-7.9A5 5 0 0 0 7 11a3.5 3.5 0 0 0 1 6z"
          fill="#FDE68A"
        />
      </svg>
    )
  }
  return (
    <svg
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" fill="#FBBF24" r="5" />
      <line stroke="#FBBF24" strokeLinecap="round" strokeWidth="2" x1="12" x2="12" y1="3" y2="5" />
      <line stroke="#FBBF24" strokeLinecap="round" strokeWidth="2" x1="12" x2="12" y1="19" y2="21" />
      <line stroke="#FBBF24" strokeLinecap="round" strokeWidth="2" x1="3" x2="5" y1="12" y2="12" />
      <line stroke="#FBBF24" strokeLinecap="round" strokeWidth="2" x1="19" x2="21" y1="12" y2="12" />
    </svg>
  )
}

function WeatherPage({
  onLocateUser,
  onThemeChange,
}: {
  onLocateUser?: () => void
  onThemeChange?: (theme: "sunny" | "rainy" | "cloudy" | "night") => void
}) {
  const [data, setData] = useState<DetailedWeatherData>(DEFAULT_HCMC_WEATHER)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<
    Array<{
      name: string
      country: string
      admin1?: string
      lat: number
      lng: number
      displayLabel: string
    }>
  >([])
  const [showDropdown, setShowDropdown] = useState(false)
  const searchWrapRef = useRef<HTMLDivElement>(null)

  // Tải thời tiết thực tế từ Open-Meteo khi mở tab
  useEffect(() => {
    let active = true
        async function loadInitial() {
      setLoading(true)
      try {
        const { latitude, longitude } = await getUserLocation()
        const geo = await reverseGeocodeApi(latitude, longitude)
        const locationLabel = geo.district ? `${geo.district}, TP.HCM` : (geo.location || "Hồ Chí Minh")
        const res = await fetchFullRealWeather(latitude, longitude, locationLabel)
        if (active) {
          setData(res)
          onThemeChange?.(res.theme)
          setLoading(false)
        }
      } catch {
        const res = await fetchFullRealWeather(10.7769, 106.7009, "Hồ Chí Minh")
        if (active) {
          setData(res)
          onThemeChange?.(res.theme)
          setLoading(false)
        }
      }
    }
    loadInitial()
    return () => {
      active = false
    }
  }, [])

  // Tìm kiếm địa điểm với debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      const results = await searchWeatherLocation(searchQuery)
      setSearchResults(results)
      setShowDropdown(results.length > 0)
      setSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchWrapRef.current &&
        !searchWrapRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Chọn một địa điểm tìm được
  async function handleSelectLocation(loc: {
    name: string
    lat: number
    lng: number
  }) {
    setShowDropdown(false)
    setSearchQuery("")
    setLoading(true)
    const fresh = await fetchFullRealWeather(loc.lat, loc.lng, loc.name)
    setData(fresh)
    onThemeChange?.(fresh.theme)
    setLoading(false)
  }

  // Định vị GPS của người dùng hiện tại và tự động nhận diện Quận/Phường thực tế
  async function handleUseGps() {
    setLoading(true)
    try {
      const { latitude, longitude } = await getUserLocation()
      const geo = await reverseGeocodeApi(latitude, longitude)
      const locationLabel = geo.location || (geo.district ? `${geo.district}, TP.HCM` : "Hồ Chí Minh")

      const fresh = await fetchFullRealWeather(
        latitude,
        longitude,
        locationLabel,
      )
      setData(fresh)
      onThemeChange?.(fresh.theme)
      onLocateUser?.()
    } catch (err) {
      console.warn("Failed to locate weather position:", err)
    } finally {
      setLoading(false)
    }
  }

  // Xác định theme class theo điều kiện thời tiết thật
  const themeClass =
    data.theme === "rainy"
      ? "theme-rainy"
      : data.theme === "night"
        ? "theme-night"
        : "theme-sunny"

  return (
    <div className={`weather-view-shell ${themeClass}`}>
      <div className="weather-container">
        {/* Top Header Row with Title & Search Bar */}
        <header className="weather-page-header">
          <div className="weather-title-block">
            <span className="weather-kicker">THỜI TIẾT ĐỊA PHƯƠNG</span>
            <h1 className="weather-main-heading">Hôm nay trời thế nào?</h1>
          </div>

          <div className="weather-search-box" ref={searchWrapRef}>
            <div className="weather-search-input-wrap">
              <svg
                className="search-icon"
                fill="none"
                height="18"
                viewBox="0 0 24 24"
                width="18"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <line
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2"
                  x1="20"
                  x2="16"
                  y1="20"
                  y2="16"
                />
              </svg>
              <input
                aria-label="Tìm kiếm thành phố hoặc khu vực"
                className="weather-search-input"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm thành phố..."
                type="text"
                value={searchQuery}
              />
              <button
                aria-label="Lấy vị trí GPS hiện tại"
                className="weather-gps-btn"
                onClick={handleUseGps}
                title="Lấy vị trí GPS hiện tại của bạn"
                type="button"
              >
                <svg
                  fill="none"
                  height="18"
                  viewBox="0 0 24 24"
                  width="18"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="8"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <line stroke="currentColor" strokeWidth="2" x1="12" x2="12" y1="2" y2="5" />
                  <line stroke="currentColor" strokeWidth="2" x1="12" x2="12" y1="19" y2="22" />
                  <line stroke="currentColor" strokeWidth="2" x1="2" x2="5" y1="12" y2="12" />
                  <line stroke="currentColor" strokeWidth="2" x1="19" x2="22" y1="12" y2="12" />
                  <circle cx="12" cy="12" fill="currentColor" r="2.5" />
                </svg>
              </button>
            </div>

            {/* Dropdown gợi ý địa điểm */}
            {showDropdown && (
              <ul className="weather-search-dropdown">
                {searchResults.map((item, idx) => (
                  <li key={`${item.name}-${idx}`}>
                    <button
                      className="weather-dropdown-item"
                      onClick={() => handleSelectLocation(item)}
                      type="button"
                    >
                      <strong>{item.name}</strong>
                      <small>{item.displayLabel}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </header>

        {/* Hero Current Weather Card */}
        <section className="weather-hero-card">
          <div className="hero-left-content">
            <div className="location-indicator">
              <svg
                fill="none"
                height="16"
                viewBox="0 0 24 24"
                width="16"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 21s-7-6.5-7-12a7 7 0 1 1 14 0c0 5.5-7 12-7 12z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <circle cx="12" cy="9" fill="currentColor" r="2.5" />
              </svg>
              <strong>{data.locationName}</strong>
              <span className="dot-divider">|</span>
              <span className="live-status">
                {loading ? "Đang đồng bộ…" : (data.updatedAt || "Vừa xong")}
              </span>
            </div>

            <div className="hero-temp-row">
              <span className="huge-temp">{data.tempC}°</span>
            </div>

            <div className="hero-condition">{data.condition}</div>
            <div className="hero-minmax">
              Cao nhất {data.tempMax}° · Thấp nhất {data.tempMin}°
            </div>
            <p className="hero-narrative">{data.narrative}</p>
          </div>

          <div className="hero-right-illustration">
            <WeatherIllustration
              size={210}
              theme={data.theme}
              weatherCode={data.weatherCode}
            />
          </div>
        </section>

        {/* Hourly Forecast Section */}
        <section className="weather-card hourly-section">
          <div className="weather-card-header">
            <svg
              fill="none"
              height="18"
              viewBox="0 0 24 24"
              width="18"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2"
              />
              <polyline
                points="12 7 12 12 15 15"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            <span>DỰ BÁO THEO GIỜ</span>
            <span className="weather-card-subtitle">· Khả năng có mưa & Nhiệt độ</span>
          </div>

          <div className="hourly-items-scroll">
            {data.hourly.map((h, idx) => (
              <div className="hourly-item-col" key={idx}>
                <span className="hourly-time">{h.time}</span>
                <div className="hourly-icon-wrap">
                  <WeatherSmallIcon
                    code={h.weatherCode}
                    isRain={(h.rainMm ?? 0) > 0 || h.weatherCode >= 51}
                    size={30}
                  />
                </div>
                <span className="hourly-prob" title={`Xác suất mưa: ${h.precipProb}%`}>
                  <svg
                    fill="currentColor"
                    height="11"
                    viewBox="0 0 24 24"
                    width="11"
                    style={{ opacity: 0.9, marginRight: 2 }}
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                  </svg>
                  {h.precipProb}%
                </span>
                <strong className="hourly-temp">{h.tempC}°</strong>
              </div>
            ))}
          </div>
        </section>

        {/* 2-Column Bottom Layout: 7-Day Forecast + Side Metrics */}
        <div className="weather-bottom-grid">
          {/* Left Column: 7-Day Forecast */}
          <section className="weather-card daily-forecast-card">
            <div className="weather-card-header">
              <svg
                fill="none"
                height="18"
                viewBox="0 0 24 24"
                width="18"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 14a4 4 0 0 1 .5 -7.9A5.5 5.5 0 0 1 17 8.5a3.5 3.5 0 0 1-.5 6.9z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <line stroke="currentColor" strokeWidth="2" x1="8" x2="8" y1="17" y2="20" />
                <line stroke="currentColor" strokeWidth="2" x1="12" x2="12" y1="17" y2="20" />
                <line stroke="currentColor" strokeWidth="2" x1="16" x2="16" y1="17" y2="20" />
              </svg>
              <span>DỰ BÁO 7 NGÀY</span>
            </div>

            <div className="daily-list">
              {data.daily.map((d, idx) => {
                const rangeWidth = Math.min(
                  100,
                  Math.max(25, ((d.tempMax - d.tempMin) / 14) * 100),
                )
                return (
                  <div className="daily-row-item" key={idx}>
                    <span className="daily-name">{d.dayLabel}</span>
                    <span className="daily-badge">{d.conditionBadge}</span>
                    <div className="daily-icon-box">
                      <WeatherSmallIcon
                        code={d.weatherCode}
                        isRain={d.conditionBadge.includes("mưa")}
                        size={24}
                      />
                    </div>
                    <span className="daily-min">{d.tempMin}°</span>
                    <div className="daily-bar-track">
                      <div
                        className="daily-bar-range"
                        style={{ width: `${rangeWidth}%` }}
                      />
                    </div>
                    <span className="daily-max">{d.tempMax}°</span>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Right Column: 3 Metric Cards (Grid 2 on top, 1 full-width on bottom matching reference) */}
          <div className="metrics-column">
            <div className="metrics-subgrid-2col">
              {/* Card 1: Humidity */}
              <article className="weather-card metric-card">
                <div className="metric-header">
                  <svg
                    fill="none"
                    height="18"
                    viewBox="0 0 24 24"
                    width="18"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  <span>ĐỘ ẨM</span>
                </div>
                <div className="metric-big-value">{data.humidityPercent}%</div>
                <p className="metric-note">Độ ẩm hiện tại ngoài trời</p>
              </article>

              {/* Card 2: Wind */}
              <article className="weather-card metric-card">
                <div className="metric-header">
                  <svg
                    fill="none"
                    height="18"
                    viewBox="0 0 24 24"
                    width="18"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                  <span>GIÓ</span>
                </div>
                <div className="metric-big-value">{data.windSpeedKmh} <small>km/h</small></div>
                <p className="metric-note">
                  Gió nhẹ, hướng {data.windDirectionText}
                </p>
              </article>
            </div>

            {/* Card 3: Sunrise & Sunset (Full width below) */}
            <article className="weather-card metric-card sun-card">
              <div className="metric-header">
                <svg
                  fill="none"
                  height="18"
                  viewBox="0 0 24 24"
                  width="18"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>MẶT TRỜI</span>
              </div>
              <div className="metric-big-value">{data.sunsetTime}</div>
              <p className="metric-note">
                Hoàng hôn hôm nay · Mặt trời mọc lúc {data.sunriseTime}
              </p>
            </article>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WeatherPage
