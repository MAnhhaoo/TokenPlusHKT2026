import WeatherPage from "@/components/weather/WeatherPage"
import { useEffect, useState } from "react"
import BottomNav from "@/components/layout/BottomNav"
import TopBar from "@/components/layout/TopBar"
import NotificationsModal from "@/components/layout/NotificationsModal"
import Icon from "@/components/ui/Icon"
import WaterGauge from "@/components/ui/WaterGauge"
import MapCanvas from "@/components/map/MapCanvas"
import MapLegend from "@/components/map/MapLegend"
import RouteSearch from "@/components/journey/RouteSearch"
import JourneyPanel from "@/components/journey/JourneyPanel"
import ReportModal from "@/components/report/ReportModal"
import AuthModal from "@/components/auth/AuthModal"
import {
  EMPTY_ROUTES,
  fetchActiveAlertsApi,
  fetchCurrentWeather,
  fetchForecastSlots,
  fetchJourneyRoutes,
  fetchMapPointsApi,
  getSavedAuthUser,
  getSavedRoutes,
  removeSavedRoutePair,
  saveAuthSession,
  saveRoutePair,
  subscribeUserRealtime,
  syncWeatherForecasts,
} from "@/lib/api"
import type {
  AppTab,
  VehicleMode,
  AreaAlertItem,
  CommunityUserProfile,
  ForecastSlot,
  MapFloodPoint,
  NavigationStep,
  RouteEndpoint,
  RouteId,
  RouteItem,
  SavedRoutePair,
  WeatherSnapshot,
} from "@/types"

const DEFAULT_FORECAST_SLOTS: ForecastSlot[] = [
  { id: "now", label: "Hiện tại", rain: "0 mm", risk: "Thấp", zone: 0 },
  { id: "30", label: "+30 phút", rain: "0 mm", risk: "Thấp", zone: 0 },
  { id: "60", label: "+60 phút", rain: "0 mm", risk: "Thấp", zone: 0 },
  { id: "90", label: "+90 phút", rain: "0 mm", risk: "Thấp", zone: 0 },
]

const EMPTY_FORECAST: ForecastSlot = DEFAULT_FORECAST_SLOTS[0]

function calculateEta(minutesStr?: string): string {
  const match = (minutesStr || "").match(/\d+/)
  const minutes = match ? parseInt(match[0], 10) : 15
  const now = new Date()
  now.setMinutes(now.getMinutes() + minutes)
  const h = String(now.getHours()).padStart(2, "0")
  const m = String(now.getMinutes()).padStart(2, "0")
  return `${h}:${m}`
}

function App() {
  const [forecastIndex, setForecastIndex] = useState(0)
  const [mapMode, setMapMode] = useState<"realtime" | "history">("realtime")
  const [selectedRoute, setSelectedRoute] = useState<RouteId>("safe")
  const [vehicleMode, setVehicleMode] = useState<VehicleMode>("motorcycle")
  const [reportOpen, setReportOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifMode, setNotifMode] = useState<"alerts" | "guide">("alerts")
  const [currentUser, setCurrentUser] = useState<CommunityUserProfile | null>(
    () => getSavedAuthUser(),
  )
  const [savedRoutes, setSavedRoutes] = useState<SavedRoutePair[]>(() =>
    getSavedRoutes(),
  )
  const [activeAlerts, setActiveAlerts] = useState<AreaAlertItem[]>([])
  const [panelExpanded, setPanelExpanded] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [navStepIndex, setNavStepIndex] = useState(0)
  const [recenterTrigger, setRecenterTrigger] = useState(0)
  const [liveDistanceToTurn, setLiveDistanceToTurn] = useState<number | null>(null)
  const [liveSpeed, setLiveSpeed] = useState<number>(32)
  const [liveRemainingKm, setLiveRemainingKm] = useState<string | null>(null)
  const [liveRemainingMin, setLiveRemainingMin] = useState<number | null>(null)
  const [stepForwardTrigger, setStepForwardTrigger] = useState(0)
  const [mainView, setMainView] = useState<"map" | "weather">("map")
  const [weatherTheme, setWeatherTheme] = useState<"sunny" | "rainy" | "cloudy" | "night">("rainy")
  const [activeTab, setActiveTab] = useState<AppTab>("map")

  const [origin, setOrigin] = useState<RouteEndpoint | null>(null)
  const [destination, setDestination] = useState<RouteEndpoint | null>(null)
  const [floodPoints, setFloodPoints] = useState<MapFloodPoint[]>([])

  const [forecasts, setForecasts] = useState<ForecastSlot[]>(DEFAULT_FORECAST_SLOTS)
  const [routesData, setRoutesData] = useState<Record<RouteId, RouteItem>>({
    safe: { ...EMPTY_ROUTES.safe },
    balanced: { ...EMPTY_ROUTES.balanced },
  })
  const [navigationSteps, setNavigationSteps] = useState<NavigationStep[]>([])
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null)
  const [isLiveBackend, setIsLiveBackend] = useState(false)
  const [rerouteNotice, setRerouteNotice] = useState<string | null>(null)

  // Tự động chẩn đoán và cập nhật điểm ngập theo thời tiết thực và mốc dự báo được chọn
  useEffect(() => {
    let active = true
    const currentSlot = forecasts[forecastIndex] ?? forecasts[0]
    const slotRain = currentSlot ? Number.parseInt(currentSlot.rain, 10) || 0 : (weather?.currentRainMm ?? 0)

    async function updatePoints() {
      const pts = await fetchMapPointsApi(slotRain, mapMode)
      if (active) setFloodPoints(pts)
    }
    updatePoints()
    return () => { active = false }
  }, [forecastIndex, mapMode, forecasts, weather])

  // 1. Tải dữ liệu hệ thống khởi động (Thời tiết, Dự báo, Điểm ngập, Cảnh báo) - CHỈ CHẠY 1 LẦN KHI MOUNT
  useEffect(() => {
    let active = true
    async function loadFromBackend() {
      const [weatherSnap, forecastRes, pointsRes, alertsRes] =
        await Promise.all([
          fetchCurrentWeather(),
          fetchForecastSlots(),
          fetchMapPointsApi(),
          fetchActiveAlertsApi(),
        ])
      if (!active) return
      if (weatherSnap) setWeather(weatherSnap)
      if (forecastRes.slots.length > 0) setForecasts(forecastRes.slots)
      if (pointsRes.length > 0) setFloodPoints(pointsRes)
      setActiveAlerts(alertsRes)
      setIsLiveBackend(Boolean(weatherSnap) || forecastRes.live)
    }
    loadFromBackend()

    const unsubscribe = subscribeUserRealtime({
      onWeatherUpdated: ({ snapshot, slots }) => {
        if (!active) return
        if (snapshot) setWeather(snapshot)
        if (slots && slots.length > 0) setForecasts(slots)
        setIsLiveBackend(true)
      },
      onRouteRecomputeNeeded: async () => {
        const pointsRes = await fetchMapPointsApi()
        if (!active) return
        if (pointsRes.length > 0) setFloodPoints(pointsRes)
      },
      onAlertsChanged: async () => {
        const alertsRes = await fetchActiveAlertsApi()
        if (!active) return
        setActiveAlerts(alertsRes)
      },
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  // 2. TỨC THÌ TÍNH TOÁN LỘ TRÌNH NGAY KHI ĐIỂM ĐI, ĐIỂM ĐẾN HOẶC PHƯƠNG TIỆN THAY ĐỔI
  useEffect(() => {
    if (!origin || !destination) {
      setRoutesData({
        safe: { ...EMPTY_ROUTES.safe },
        balanced: { ...EMPTY_ROUTES.balanced },
      })
      setNavigationSteps([])
      return
    }

    let active = true
    // Xóa ngay dữ liệu tuyến cũ để tránh hiển thị nhầm lộ trình cũ của điểm trước đó
    setRoutesData({
      safe: { ...EMPTY_ROUTES.safe },
      balanced: { ...EMPTY_ROUTES.balanced },
    })
    setNavigationSteps([])

    async function computeRoutesNow() {
      try {
        const routesRes = await fetchJourneyRoutes(
          origin!.coords,
          destination!.coords,
          floodPoints,
          vehicleMode,
        )
        if (!active) return
        if (routesRes && routesRes.routes?.safe?.coordinates && routesRes.routes.safe.coordinates.length > 1) {
          setRoutesData(routesRes.routes)
          setNavigationSteps(routesRes.navigationSteps)
        }
      } catch (err) {
        console.warn("fetchJourneyRoutes error:", err)
      }
    }

    computeRoutesNow()

    return () => {
      active = false
    }
  }, [origin?.coords[0], origin?.coords[1], destination?.coords[0], destination?.coords[1], vehicleMode])

  async function handleSyncWeather() {
    const [weatherSnap, syncedSlots] = await Promise.all([
      fetchCurrentWeather(),
      syncWeatherForecasts(),
    ])
    if (weatherSnap) setWeather(weatherSnap)
    if (syncedSlots && syncedSlots.length > 0) setForecasts(syncedSlots)
  }

  function handleSwapEndpoints() {
    const prevOrigin = origin
    setOrigin(destination)
    setDestination(prevOrigin)
  }

  function handleSaveCurrentRoute() {
    if (!origin || !destination) return
    const next = saveRoutePair(origin, destination)
    setSavedRoutes(next)
  }

  function handleSelectSavedRoute(pair: SavedRoutePair) {
    setOrigin(pair.origin)
    setDestination(pair.destination)
  }

  function handleRemoveSavedRoute(id: string) {
    const next = removeSavedRoutePair(id)
    setSavedRoutes(next)
  }

  const forecast = forecasts[forecastIndex] ?? forecasts[0] ?? EMPTY_FORECAST
  const rainValue = Number.parseInt(forecast.rain, 10) || 0

  useEffect(() => {
    if (!reportOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [reportOpen])

  function toggleNavigation() {
    setIsNavigating((current) => {
      const next = !current
      if (next) {
        setNavStepIndex(0)
        setLiveDistanceToTurn(null)
        setLiveRemainingKm(null)
        setLiveRemainingMin(null)
        setRecenterTrigger(Date.now())
      }
      return next
    })
    setPanelExpanded(false)
    setActiveTab("map")
  }


  async function handleAutoReroute(currentCoords: [number, number]) {
    if (!destination) return
    setRerouteNotice("Đang tính toán lại lộ trình tránh ngập...")

    const updatedOrigin: RouteEndpoint = {
      label: "Vị trí hiện tại",
      address: "Đoạn đường vừa rẽ",
      district: origin?.district || "TP.HCM",
      coords: currentCoords,
      isCurrentLocation: true,
    }
    setOrigin(updatedOrigin)

    try {
      const routesRes = await fetchJourneyRoutes(
        currentCoords,
        destination.coords,
        floodPoints,
        vehicleMode,
      )
      if (routesRes && routesRes.routes?.safe?.coordinates && routesRes.routes.safe.coordinates.length > 1) {
        setRoutesData(routesRes.routes)
        setNavigationSteps(routesRes.navigationSteps)
        setNavStepIndex(0)
        setLiveDistanceToTurn(null)
        setRerouteNotice("Đã đổi lộ trình mới tránh ngập!")
        setTimeout(() => setRerouteNotice(null), 3000)
      } else {
        setRerouteNotice(null)
      }
    } catch (err) {
      console.warn("Auto-reroute error:", err)
      setRerouteNotice(null)
    }
  }

  function handleStopNavigation() {
    setIsNavigating(false)
    setNavStepIndex(0)
  }

  function selectTab(tab: AppTab) {
    setActiveTab(tab)
    setPanelExpanded(tab !== "map")
  }

  const currentStep = navigationSteps[navStepIndex] ?? navigationSteps[0]
  const nextStep = navigationSteps[navStepIndex + 1]
  const activeRouteData = routesData[selectedRoute] ?? routesData.safe

  return (
    <main
      className={`app-shell ${
        panelExpanded ? "panel-expanded" : "panel-collapsed"
      } ${isNavigating ? "is-navigating" : ""} ${mainView === "weather" ? `in-weather-view theme-${weatherTheme}` : ""}`}
    >
      <h1 className="sr-only">SaigonDrain AI — Bản đồ an toàn TP.HCM</h1>
      <TopBar
        activeMainTab={mainView}
        alertCount={activeAlerts.length}
        currentUser={currentUser}
        onOpenAlerts={() => {
          setNotifMode("alerts")
          setNotifOpen(true)
        }}
        onOpenAuth={() => setAuthOpen(true)}
        onOpenGuide={() => {
          setNotifMode("guide")
          setNotifOpen(true)
        }}
        onSelectMainTab={setMainView}
        onSyncWeather={handleSyncWeather}
        weather={weather}
      />

      {mainView === "weather" ? (
        <WeatherPage onThemeChange={setWeatherTheme} />
      ) : (
        <>
          {!isNavigating && (
            <div className="desktop-sidebar">
        <RouteSearch
          destination={destination}
          onSelectDestination={setDestination}
          onSelectOrigin={setOrigin}
          onSwap={handleSwapEndpoints}
          origin={origin}
          vehicleMode={vehicleMode}
          onSelectVehicleMode={setVehicleMode}
        />
        <JourneyPanel
          canSaveRoute={Boolean(origin && destination)}
          expanded
          forecastIndex={forecastIndex}
          forecasts={forecasts}
          isNavigating={isNavigating}
          navigationSteps={navigationSteps}
          onRemoveSavedRoute={handleRemoveSavedRoute}
          onReport={() => setReportOpen(true)}
          onSaveCurrentRoute={handleSaveCurrentRoute}
          onSelectSavedRoute={handleSelectSavedRoute}
          onStart={toggleNavigation}
          routesData={routesData}
          savedRoutes={savedRoutes}
          selectedRoute={selectedRoute}
          setExpanded={() => undefined}
          setForecastIndex={setForecastIndex}
          setSelectedRoute={setSelectedRoute}
          weather={weather}
          vehicleMode={vehicleMode}
          onSelectVehicleMode={setVehicleMode}
        />
            </div>
          )}

      <section className="map-stage">
        <MapCanvas
          destination={destination}
          floodPoints={floodPoints}
          mapMode={mapMode}
          onToggleMapMode={() => setMapMode((prev) => (prev === "realtime" ? "history" : "realtime"))}
          isNavigating={isNavigating}
          onReroute={handleAutoReroute}
          navStepIndex={navStepIndex}
          navigationSteps={navigationSteps}
          onProgressUpdate={(info) => {
            setLiveDistanceToTurn(info.distanceToTurnM)
            setLiveSpeed(info.speedKmh)
            setLiveRemainingKm((info.remainingKmM / 1000).toFixed(1).replace(".", ","))
            setLiveRemainingMin(info.remainingMinutes)
          }}
          onStepChange={(newStep) => {
            setNavStepIndex(newStep)
          }}
          origin={origin}
          recenterTrigger={recenterTrigger}
          route={selectedRoute}
          routesData={routesData}
          stepForwardTrigger={stepForwardTrigger}
        />

        <div className="map-top-stack">
          <div className="mobile-search">
            <RouteSearch
              destination={destination}
              onSelectDestination={setDestination}
              onSelectOrigin={setOrigin}
              onSwap={handleSwapEndpoints}
              origin={origin}
              vehicleMode={vehicleMode}
              onSelectVehicleMode={setVehicleMode}
            />
          </div>

          {!isNavigating && (
            <button
              className={`map-risk-card ${rainValue > 0 || forecast.zone > 0 ? `zone-${forecast.zone}` : "is-sunny"}`}
              onClick={() => {
                setActiveTab("tracking")
                setPanelExpanded(true)
              }}
              type="button"
            >
              <span className={`map-risk-icon ${rainValue > 0 || forecast.zone > 0 ? "" : "is-sunny"}`}>
                <Icon
                  name={
                    forecast.zone === 2
                      ? "alert"
                      : rainValue > 0 || forecast.zone === 1
                        ? "rain"
                        : "sun"
                  }
                  size={22}
                />
              </span>
              <span className="map-risk-copy">
                {rainValue > 0 || forecast.zone > 0 ? (
                  <>
                    <small>{forecast.label}</small>
                    <strong>
                      {forecast.rain} mưa · nguy cơ {forecast.risk.toLowerCase()}
                    </strong>
                    <WaterGauge
                      compact
                      label="mm mưa"
                      max={60}
                      tone={forecast.zone}
                      value={rainValue}
                    />
                  </>
                ) : (
                  <>
                    <small>
                      {forecast.label} · {weather ? Math.round(weather.temperatureC) : 31}°C
                    </small>
                    <strong>
                      {weather?.weatherCondition || "Trời nắng ráo"} · An toàn di chuyển
                    </strong>
                    <span className="weather-safe-note">
                      Đường khô ráo, không có nguy cơ ngập
                    </span>
                  </>
                )}
              </span>
              <Icon name="chevron" size={18} />
            </button>
          )}
        </div>

        {isNavigating && (
          <div className="google-nav-hud-top">
            {rerouteNotice && (
              <div className="nav-hud-reroute-toast">
                <div className="reroute-pulse-ring" />
                <span className="reroute-toast-text">{rerouteNotice}</span>
              </div>
            )}
            <div className="nav-hud-maneuver">
              <div className={`nav-hud-turn-icon is-${currentStep?.icon || "straight"}`}>
                <Icon name={currentStep?.icon || "straight"} size={32} />
              </div>
              <div className="nav-hud-instruction">
                <div className="nav-hud-top-meta">
                  <span className="nav-hud-distance">
                    {liveDistanceToTurn !== null ? `Trong ${liveDistanceToTurn} m` : `Trong ${currentStep?.distance || "150 m"}`}
                  </span>
                  <span className="live-tracking-badge is-active">
                    <span className="live-tracking-dot" />
                    GPS Trực tiếp (Theo dõi người dùng)
                  </span>
                </div>
                <h2 className="nav-hud-action">
                  {currentStep ? `${currentStep.instruction} ${currentStep.street}` : "Tiếp tục di chuyển theo tuyến an toàn"}
                </h2>
                {nextStep && (
                  <div className="nav-hud-next-step">
                    <span className="nav-hud-next-label">Sau đó:</span>
                    <span className="nav-hud-next-text">{nextStep.instruction} {nextStep.street} ({nextStep.distance})</span>
                  </div>
                )}
              </div>
            </div>

            {navigationSteps.length > 1 && (
              <div className="nav-hud-stepper">
                <button
                  type="button"
                  className="hud-step-btn"
                  disabled={navStepIndex <= 0}
                  onClick={() => setNavStepIndex((prev) => Math.max(0, prev - 1))}
                  title="Bước rẽ trước"
                >
                  <Icon name="chevron-left" size={18} />
                  <span>Trước</span>
                </button>
                <span className="hud-step-indicator">
                  Bước <strong>{navStepIndex + 1}</strong> / {navigationSteps.length}
                </span>
                <button
                  type="button"
                  className="hud-step-btn"
                  disabled={navStepIndex >= navigationSteps.length - 1}
                  onClick={() => setNavStepIndex((prev) => Math.min(navigationSteps.length - 1, prev + 1))}
                  title="Bước rẽ tiếp theo"
                >
                  <span>Tiếp</span>
                  <Icon name="chevron-right" size={18} />
                </button>
              </div>
            )}
          </div>
        )}

        {isNavigating && (
          <div className="google-nav-float-actions">
            <button
              type="button"
              className="nav-float-btn"
              onClick={() => setRecenterTrigger(Date.now())}
              title="Căn giữa xe"
            >
              <Icon name="location" size={20} />
              <span>Căn giữa xe</span>
            </button>
            <button
              type="button"
              className="nav-float-btn nav-test-walk-btn"
              onClick={() => setStepForwardTrigger(Date.now())}
              title="Mô phỏng bước đi 50m khi đang ở trong nhà để thử nghiệm"
            >
              <Icon name="arrow" size={18} />
              <span>Đi tới 50m</span>
            </button>
            <div className="nav-speed-badge">
              <strong>{liveSpeed}</strong>
              <small>km/h</small>
            </div>
          </div>
        )}

        {isNavigating && (
          <div className="google-nav-hud-bottom">
            <div className="nav-bottom-trip">
              <div className="nav-trip-time">
                <span className="nav-time-val">
                  {liveRemainingMin !== null ? `${liveRemainingMin} phút` : (activeRouteData.time || "12 phút")}
                </span>
                <span className="nav-dot">·</span>
                <span className="nav-dist-val">
                  {liveRemainingKm !== null ? `${liveRemainingKm} km` : (activeRouteData.distance || "3,4 km")}
                </span>
              </div>
              <div className="nav-trip-eta">
                <span>Dự kiến đến: <strong>{calculateEta(liveRemainingMin ? `${liveRemainingMin} phút` : activeRouteData.time)}</strong></span>
                <span className="nav-safety-badge">
                  <Icon name="shield" size={14} />
                  Tuyến an toàn · Đã tránh ngập
                </span>
              </div>
            </div>
            <button
              type="button"
              className="nav-bottom-exit-btn"
              onClick={handleStopNavigation}
              title="Kết thúc hành trình dẫn đường"
            >
              <Icon name="close" size={18} />
              <span>Kết thúc</span>
            </button>
          </div>
        )}

        {isNavigating && (
          <div className="google-nav-hud-bottom">
            <div className="nav-bottom-trip">
              <div className="nav-trip-time">
                <span className="nav-time-val">{activeRouteData.time || "12 phút"}</span>
                <span className="nav-dot">·</span>
                <span className="nav-dist-val">{activeRouteData.distance || "3,4 km"}</span>
              </div>
              <div className="nav-trip-eta">
                <span>Dự kiến đến: <strong>{calculateEta(activeRouteData.time)}</strong></span>
                <span className="nav-safety-badge">
                  <Icon name="shield" size={14} />
                  Tuyến an toàn · Đã tránh ngập
                </span>
              </div>
            </div>
            <button
              type="button"
              className="nav-bottom-exit-btn"
              onClick={handleStopNavigation}
              title="Kết thúc hành trình dẫn đường"
            >
              <Icon name="close" size={18} />
              <span>Kết thúc</span>
            </button>
          </div>
        )}

        <MapLegend selectedRoute={selectedRoute} />

        <button
          className="report-fab"
          onClick={() => setReportOpen(true)}
          type="button"
        >
          <span>
            <Icon name="plus" size={20} />
          </span>
          Báo cáo
        </button>

        <span className="demo-label">
          {isLiveBackend
            ? "Dữ liệu trực tuyến · PostgreSQL & Open-Meteo"
            : "Đang đồng bộ Backend…"}
        </span>
      </section>

      {!isNavigating && (
        <div className="mobile-panel">
          <JourneyPanel
            canSaveRoute={Boolean(origin && destination)}
            expanded={panelExpanded}
            focusSection={
              activeTab === "tracking"
                ? "forecast"
                : activeTab === "saved"
                  ? "routes"
                  : null
            }
            forecastIndex={forecastIndex}
            forecasts={forecasts}
            isNavigating={isNavigating}
            navigationSteps={navigationSteps}
            onRemoveSavedRoute={handleRemoveSavedRoute}
            onReport={() => setReportOpen(true)}
            onSaveCurrentRoute={handleSaveCurrentRoute}
            onSelectSavedRoute={handleSelectSavedRoute}
            onStart={toggleNavigation}
            routesData={routesData}
            savedRoutes={savedRoutes}
            selectedRoute={selectedRoute}
            setExpanded={setPanelExpanded}
            setForecastIndex={setForecastIndex}
            setSelectedRoute={setSelectedRoute}
            weather={weather}
            vehicleMode={vehicleMode}
            onSelectVehicleMode={setVehicleMode}
          />
        </div>
      )}

      {!isNavigating && <BottomNav activeTab={activeTab} onSelect={selectTab} />}
        </>
      )}

      <ReportModal
        onClose={() => setReportOpen(false)}
        onReportCreated={() => {
          if (currentUser) {
            const updated: CommunityUserProfile = {
              ...currentUser,
              reports: currentUser.reports + 1,
            }
            setCurrentUser(updated)
            saveAuthSession(updated)
          }
        }}
        open={reportOpen}
        reporterId={currentUser?.id}
      />

      <AuthModal
        currentUser={currentUser}
        onAuthSuccess={(user) => setCurrentUser(user)}
        onClose={() => setAuthOpen(false)}
        onLogout={() => setCurrentUser(null)}
        open={authOpen}
      />

      <NotificationsModal
        alerts={activeAlerts}
        mode={notifMode}
        onChangeMode={setNotifMode}
        onClose={() => setNotifOpen(false)}
        open={notifOpen}
      />
    </main>
  )
}

export default App
