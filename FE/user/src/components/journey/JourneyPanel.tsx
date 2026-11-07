import { useEffect, useRef } from "react"
import Icon from "@/components/ui/Icon"
import type {
  ForecastSlot,
  NavigationStep,
  RouteId,
  RouteItem,
  SavedRoutePair,
  VehicleMode,
  WeatherSnapshot,
} from "@/types"
import JourneyStatus from "@/components/journey/JourneyStatus"
import ForecastTimeline from "@/components/journey/ForecastTimeline"
import RouteOption from "@/components/journey/RouteOption"
import TurnByTurnDirections from "@/components/journey/TurnByTurnDirections"

function JourneyPanel({
  forecastIndex,
  setForecastIndex,
  selectedRoute,
  setSelectedRoute,
  expanded,
  setExpanded,
  isNavigating,
  onStart,
  onReport,
  focusSection,
  forecasts,
  routesData,
  navigationSteps,
  canSaveRoute,
  onSaveCurrentRoute,
  savedRoutes,
  onSelectSavedRoute,
  onRemoveSavedRoute,
  weather,
  vehicleMode = "motorcycle",
  onSelectVehicleMode,
}: {
  forecastIndex: number
  setForecastIndex: (index: number) => void
  selectedRoute: RouteId
  setSelectedRoute: (route: RouteId) => void
  expanded: boolean
  setExpanded: (expanded: boolean) => void
  isNavigating: boolean
  onStart: () => void
  onReport: () => void
  focusSection?: "forecast" | "routes" | null
  forecasts: readonly ForecastSlot[]
  routesData: Record<RouteId, RouteItem>
  navigationSteps: readonly NavigationStep[]
  canSaveRoute?: boolean
  onSaveCurrentRoute?: () => void
  savedRoutes?: readonly SavedRoutePair[]
  onSelectSavedRoute?: (pair: SavedRoutePair) => void
  onRemoveSavedRoute?: (id: string) => void
  weather?: WeatherSnapshot | null
  vehicleMode?: VehicleMode
  onSelectVehicleMode?: (mode: VehicleMode) => void
}) {
  const forecastRef = useRef<HTMLDivElement>(null)
  const routesRef = useRef<HTMLDivElement>(null)

  const hasEndpoints = Boolean(canSaveRoute)
  const hasRoute = Boolean(
    hasEndpoints &&
      routesData?.safe?.coordinates &&
      routesData.safe.coordinates.length > 1
  )

  useEffect(() => {
    if (!expanded || !focusSection) return
    const target =
      focusSection === "routes" ? routesRef.current : forecastRef.current
    if (!target) return
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [expanded, focusSection])

  return (
    <section
      className={`journey-panel ${expanded ? "is-expanded" : "is-collapsed"}`}
    >
      <button
        aria-expanded={expanded}
        aria-label={
          expanded ? "Thu gọn bảng hành trình" : "Mở rộng bảng hành trình"
        }
        className="sheet-handle"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <span />
      </button>

      <div className="panel-body">
        {isNavigating && (
          <div className="navigation-strip">
            <span>
              <Icon name="route" size={18} />
            </span>
            <strong>Đang dẫn đường ({vehicleMode === "car" ? "Ô tô" : "Xe máy"})</strong>
            <small>
              còn {routesData[selectedRoute].time} ·{" "}
              {routesData[selectedRoute].distance}
            </small>
          </div>
        )}

        <JourneyStatus
          forecastIndex={forecastIndex}
          slots={forecasts}
          weather={weather}
        />

        <div className="panel-scroll">
          <div ref={forecastRef}>
            <ForecastTimeline
              value={forecastIndex}
              onChange={setForecastIndex}
              slots={forecasts}
            />
          </div>

          {hasEndpoints ? (
            /* Khi đã nhập đủ điểm đi và điểm đến: Hiện lựa chọn phương tiện & các tuyến đường */
            <div className="route-section" ref={routesRef}>
              <div className="section-heading route-heading">
                <div>
                  <h2>Chọn phương tiện di chuyển</h2>
                  <p>Hệ thống tự động tìm đường né ngập theo phương tiện.</p>
                </div>
                {canSaveRoute && onSaveCurrentRoute && (
                  <button
                    className="save-route-btn"
                    onClick={onSaveCurrentRoute}
                    title="Lưu lộ trình này vào mục đã lưu"
                    type="button"
                  >
                    <Icon name="pin" size={16} />
                    <span>Lưu lộ trình</span>
                  </button>
                )}
              </div>

              {onSelectVehicleMode && (
                <div
                  className="journey-vehicle-selector"
                  role="tablist"
                  aria-label="Chọn loại phương tiện"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={vehicleMode !== "car"}
                    className={`vehicle-select-chip ${vehicleMode !== "car" ? "is-active" : ""}`}
                    onClick={() => onSelectVehicleMode("motorcycle")}
                  >
                    <div className="vehicle-chip-main">
                      <Icon name="bike" size={19} />
                      <strong>Xe máy</strong>
                    </div>
                    <small>Luồn hẻm, né ngập sâu &gt; 20cm</small>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={vehicleMode === "car"}
                    className={`vehicle-select-chip ${vehicleMode === "car" ? "is-active" : ""}`}
                    onClick={() => onSelectVehicleMode("car")}
                  >
                    <div className="vehicle-chip-main">
                      <Icon name="car" size={19} />
                      <strong>Xe hơi</strong>
                    </div>
                    <small>Trục đường lớn, né hẻm nhỏ</small>
                  </button>
                </div>
              )}

              <div className="section-subheading">
                <h3>Tuyến đường gợi ý ({vehicleMode === "car" ? "Xe hơi" : "Xe máy"})</h3>
                <small>So sánh thời gian và nguy cơ ngập</small>
              </div>

              <div className="route-options">
                <RouteOption
                  id="safe"
                  onSelect={setSelectedRoute}
                  routeItem={routesData.safe}
                  selected={selectedRoute === "safe"}
                />
                <RouteOption
                  id="balanced"
                  onSelect={setSelectedRoute}
                  routeItem={routesData.balanced}
                  selected={selectedRoute === "balanced"}
                />
              </div>

              {savedRoutes && savedRoutes.length > 0 && (
                <div className="saved-routes-box">
                  <div className="saved-routes-header">
                    <Icon name="pin" size={15} />
                    <span>Lộ trình quen thuộc đã lưu ({savedRoutes.length})</span>
                  </div>
                  <div className="saved-routes-list">
                    {savedRoutes.map((pair) => (
                      <div className="saved-route-item" key={pair.id}>
                        <button
                          className="saved-route-select"
                          onClick={() => onSelectSavedRoute?.(pair)}
                          type="button"
                        >
                          <strong>{pair.origin.label}</strong>
                          <small>→ {pair.destination.label}</small>
                        </button>
                        {onRemoveSavedRoute && (
                          <button
                            aria-label="Xóa lộ trình đã lưu"
                            className="saved-route-delete"
                            onClick={() => onRemoveSavedRoute(pair.id)}
                            type="button"
                          >
                            <Icon name="close" size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={`route-explanation ${selectedRoute}`}>
                <span className="explanation-icon">
                  <Icon
                    name={selectedRoute === "safe" ? "shield" : "alert"}
                    size={19}
                  />
                </span>
                <p>{routesData[selectedRoute].detail}</p>
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#047857', background: '#ecfdf5', padding: '6px 10px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                  <strong>🤖 Mô hình AI:</strong>
                  <span>Tuyến đường được phân tích nguy cơ ngập qua mô hình GIS MCDA & LightGBM</span>
                </div>
              </div>

              <TurnByTurnDirections
                distance={routesData[selectedRoute].distance}
                durationText={routesData[selectedRoute].time}
                steps={navigationSteps}
              />
            </div>
          ) : (
            /* Khi CHƯA nhập điểm đi/điểm đến: Ẩn phần tuyến đường, hiện hướng dẫn */
            <div className="journey-idle-state">
              <div className="journey-prompt-box">
                <div className="prompt-icon-wrap">
                  <Icon name="route" size={28} />
                </div>
                <div className="prompt-text">
                  <strong>Chưa chọn điểm xuất phát & điểm đến</strong>
                  <p>
                    Vui lòng nhập <b>Điểm đi</b> và <b>Điểm đến</b> ở thanh tìm kiếm phía trên để hệ thống tự động tìm tuyến đường né ngập an toàn nhất.
                  </p>
                </div>
              </div>

              {savedRoutes && savedRoutes.length > 0 && (
                <div className="saved-routes-box">
                  <div className="saved-routes-header">
                    <Icon name="pin" size={15} />
                    <span>Lộ trình quen thuộc đã lưu ({savedRoutes.length})</span>
                  </div>
                  <div className="saved-routes-list">
                    {savedRoutes.map((pair) => (
                      <div className="saved-route-item" key={pair.id}>
                        <button
                          className="saved-route-select"
                          onClick={() => onSelectSavedRoute?.(pair)}
                          type="button"
                        >
                          <strong>{pair.origin.label}</strong>
                          <small>→ {pair.destination.label}</small>
                        </button>
                        {onRemoveSavedRoute && (
                          <button
                            aria-label="Xóa lộ trình đã lưu"
                            className="saved-route-delete"
                            onClick={() => onRemoveSavedRoute(pair.id)}
                            type="button"
                          >
                            <Icon name="close" size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="panel-actions">
        {hasEndpoints && hasRoute ? (
          <>
            <button
              className={`start-button ${selectedRoute} ${
                isNavigating ? "is-navigating" : ""
              }`}
              onClick={onStart}
              type="button"
            >
              <span>
                <small>
                  {isNavigating ? "Đang dẫn đường" : "Bắt đầu với"}
                </small>
                <strong>
                  {isNavigating
                    ? "Kết thúc hành trình"
                    : `${routesData[selectedRoute].name} (${routesData[selectedRoute].time})`}
                </strong>
              </span>
              <Icon name={isNavigating ? "close" : "arrow"} size={21} />
            </button>
            <button className="report-secondary" onClick={onReport} type="button">
              <Icon name="camera" size={18} />
              Báo cáo hiện trường
            </button>
          </>
        ) : (
          <button className="report-secondary is-full" onClick={onReport} type="button">
            <Icon name="camera" size={18} />
            Báo cáo điểm ngập / sự cố hiện trường
          </button>
        )}
      </div>
    </section>
  )
}

export default JourneyPanel
