import { useState, type ReactNode } from "react"
import {
  ChevronDown,
  CloudRain,
  Droplets,
  History,
  Layers,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  TriangleAlert,
  X,
} from "lucide-react"
import Button from "@/components/ui/Button"
import IconButton from "@/components/ui/IconButton"
import Heading from "@/components/ui/Heading"
import { severityLabel } from "@/lib/severity"
import type { Severity, MapLayer, FloodReport, MapPoint } from "@/types"

const CENTER_LAT = 10.772
const CENTER_LNG = 106.695

function lngToTileX(lng: number, z: number): number {
  return ((lng + 180) / 360) * Math.pow(2, z)
}

function latToTileY(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
    Math.pow(2, z)
  )
}

type BasemapStyle = "streets" | "satellite" | "terrain"

function getTileUrl(
  style: BasemapStyle,
  tx: number,
  ty: number,
  z: number,
): string {
  if (style === "satellite") {
    return `https://mt${Math.abs(tx + ty) % 4}.google.com/vt/lyrs=y&hl=vi&x=${tx}&y=${ty}&z=${z}`
  }
  if (style === "terrain") {
    return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${ty}/${tx}`
  }
  return `https://mt${Math.abs(tx + ty) % 4}.google.com/vt/lyrs=m&hl=vi&x=${tx}&y=${ty}&z=${z}`
}

const styleLabels: Record<BasemapStyle, string> = {
  streets: "Đường phố",
  satellite: "Vệ tinh",
  terrain: "Địa hình",
}

function OperationsMap({
  reports,
  points,
  selectedId,
  onSelect,
  layers,
  setLayers,
  severityFilter,
  setSeverityFilter,
  onExpand,
  variant = "preview",
}: {
  reports: FloodReport[]
  points: MapPoint[]
  selectedId: string | null
  onSelect: (point: MapPoint) => void
  layers: MapLayer[]
  setLayers: (layers: MapLayer[]) => void
  severityFilter: "all" | Severity
  setSeverityFilter: (value: "all" | Severity) => void
  onExpand?: () => void
  variant?: "preview" | "full"
}) {
  const [zoom, setZoom] = useState(12)
  const [mapStyle, setMapStyle] = useState<BasemapStyle>("streets")

  const visiblePoints = points.filter((point) => {
    if (severityFilter !== "all" && point.severity !== severityFilter)
      return false
    if (point.type === "risk" && !layers.includes("risk")) return false
    if (point.type === "sensor" && !layers.includes("rain")) return false
    if (
      (point.type === "flood" || point.type === "pending") &&
      !layers.includes("flood")
    )
      return false
    if (point.type === "history" && !layers.includes("history")) return false
    if (
      point.linkedReportId &&
      reports.find((report) => report.id === point.linkedReportId)?.status ===
        "rejected"
    )
      return false
    return true
  })

  const floodCount = points.filter(
    (p) => p.type === "flood" || p.type === "pending",
  ).length
  const riskCount = points.filter((p) => p.type === "risk").length
  const rainCount = points.filter((p) => p.type === "sensor").length
  const historyCount = points.filter((p) => p.type === "history").length

  const layerOptions = [
    {
      id: "flood" as MapLayer,
      label: "Ngập hiện tại",
      count: floodCount,
      icon: <Droplets size={14} />,
      variant: "flood",
    },
    {
      id: "risk" as MapLayer,
      label: "Nguy cơ",
      count: riskCount,
      icon: <TriangleAlert size={14} />,
      variant: "risk",
    },
    {
      id: "rain" as MapLayer,
      label: "Mưa dự báo",
      count: rainCount,
      icon: <CloudRain size={14} />,
      variant: "rain",
    },
    {
      id: "history" as MapLayer,
      label: "Lịch sử ngập",
      count: historyCount,
      icon: <History size={14} />,
      variant: "history",
    },
  ]

  const selected = visiblePoints.find((point) => point.id === selectedId)

  // Build an 8x4 Web Mercator tile grid centered at 50%/50%
  const centerX = lngToTileX(CENTER_LNG, zoom)
  const centerY = latToTileY(CENTER_LAT, zoom)
  const baseTileX = Math.floor(centerX) - 3
  const baseTileY = Math.floor(centerY) - 1
  const gridCols = 8
  const gridRows = 4

  function getPointPosition(point: MapPoint): { left: number; top: number } {
    if (typeof point.lat === "number" && typeof point.lng === "number") {
      const px = lngToTileX(point.lng, zoom)
      const py = latToTileY(point.lat, zoom)
      const spanX = 2.35
      const spanY = 1.45
      const left = 50 + ((px - centerX) / spanX) * 100
      const top = 50 + ((py - centerY) / spanY) * 100
      return {
        left: Math.max(6, Math.min(94, left)),
        top: Math.max(8, Math.min(92, top)),
      }
    }
    return { left: point.x, top: point.y }
  }

  const cycleMapStyle = () => {
    setMapStyle((prev) => {
      if (prev === "streets") return "satellite"
      if (prev === "satellite") return "terrain"
      return "streets"
    })
  }

  return (
    <section className={`panel map-panel ${variant === "full" ? "is-full" : ""}`}>
      <div className="panel-heading map-heading">
        <div>
          <Heading className="panel-title">Bản đồ vận hành TP.HCM</Heading>
          <p>
            Giám sát thời gian thực & điểm đen lịch sử GIS ·{" "}
            {visiblePoints.length} điểm đang hiển thị
          </p>
        </div>
        <div className="map-heading-actions">
          <Button onClick={cycleMapStyle} variant="ghost">
            <Layers size={14} /> Nền: {styleLabels[mapStyle]}
          </Button>
          {onExpand && (
            <Button onClick={onExpand} variant="ghost">
              <Maximize2 size={14} /> Mở rộng
            </Button>
          )}
          <label className="compact-select">
            <span className="sr-only">Lọc mức độ</span>
            <select
              value={severityFilter}
              onChange={(e) =>
                setSeverityFilter(e.target.value as "all" | Severity)
              }
            >
              <option value="all">Tất cả mức độ</option>
              <option value="critical">Nghiêm trọng</option>
              <option value="high">Cao</option>
              <option value="medium">Trung bình</option>
            </select>
            <ChevronDown size={15} />
          </label>
        </div>
      </div>
      <div className="layer-bar">
        {layerOptions.map((layer) => {
          const active = layers.includes(layer.id)
          return (
            <button
              key={layer.id}
              className={`layer-btn layer-btn-${layer.variant} ${active ? "is-active" : ""}`}
              aria-pressed={active}
              onClick={() =>
                setLayers(
                  active
                    ? layers.filter((item) => item !== layer.id)
                    : [...layers, layer.id],
                )
              }
              type="button"
            >
              <span className="layer-btn-icon">{layer.icon}</span>
              <span className="layer-btn-label">{layer.label}</span>
              {layer.count > 0 && (
                <span className="layer-btn-count">{layer.count}</span>
              )}
            </button>
          )
        })}
      </div>
      <div className="map-canvas is-osm">
        <div className="osm-tile-stage" aria-hidden="true">
          {Array.from({ length: gridRows }).map((_, rowIdx) =>
            Array.from({ length: gridCols }).map((__, colIdx) => {
              const tx = baseTileX + colIdx
              const ty = baseTileY + rowIdx
              const offsetX = Math.round((tx - centerX) * 256)
              const offsetY = Math.round((ty - centerY) * 256)
              return (
                <img
                  key={`${mapStyle}-${zoom}-${tx}-${ty}`}
                  src={getTileUrl(mapStyle, tx, ty, zoom)}
                  onError={(e) => {
                    const target = e.currentTarget
                    if (!target.dataset.fallback) {
                      target.dataset.fallback = "1"
                      target.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${ty}/${tx}`
                    }
                  }}
                  style={{
                    position: "absolute",
                    left: `calc(50% + ${offsetX}px)`,
                    top: `calc(50% + ${offsetY}px)`,
                    width: "256px",
                    height: "256px",
                  }}
                  alt=""
                  className="osm-tile-img"
                  loading="eager"
                />
              )
            }),
          )}
          <div
            className="osm-tint-overlay"
            style={{
              background:
                mapStyle === "satellite"
                  ? "transparent"
                  : "linear-gradient(180deg, rgba(238, 245, 241, 0.08) 0%, rgba(11, 79, 74, 0.05) 100%)",
            }}
          />
        </div>

        {visiblePoints.map((point) => {
          const pos = getPointPosition(point)
          return (
            <button
              key={point.id}
              className={`map-marker ${point.type} ${point.severity} ${
                selectedId === point.id ? "selected" : ""
              }`}
              style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
              aria-label={`${point.label}, ${severityLabel(point.severity)}`}
              title={`${point.label} (${point.district})`}
              onClick={() => onSelect(point)}
              type="button"
            >
              <span>
                {point.type === "risk" ? (
                  <TriangleAlert size={14} />
                ) : point.type === "sensor" ? (
                  <CloudRain size={14} />
                ) : point.type === "history" ? (
                  <History size={14} />
                ) : (
                  <Droplets size={14} />
                )}
              </span>
              <small className="marker-badge">
                {point.label}
                {point.type === "history"
                  ? ` · Lịch sử ${point.historyCount} lần (Max ${point.maxDepth || point.depth || 30}cm)`
                  : point.type === "risk"
                    ? ` · Nguy cơ ${severityLabel(point.severity)}`
                    : point.type === "sensor"
                      ? ` · Mưa ${point.rainfall} mm/h`
                      : point.depth > 0
                        ? ` · Ngập ${point.depth} cm`
                        : ` · An toàn`}
              </small>
            </button>
          )
        })}

        <div className="map-controls">
          <IconButton
            label="Phóng to bản đồ"
            onClick={() => setZoom((z) => Math.min(14, z + 1))}
          >
            <Plus size={14} />
          </IconButton>
          <IconButton
            label="Thu nhỏ bản đồ"
            onClick={() => setZoom((z) => Math.max(10, z - 1))}
          >
            <Minus size={14} />
          </IconButton>
          <IconButton
            label="Đặt lại góc nhìn"
            onClick={() => setZoom(12)}
          >
            <RotateCcw size={13} />
          </IconButton>
        </div>

        {selected && (
          <div className="map-popover">
            <div className="popover-top">
              <span className={`severity-dot ${selected.severity}`} />
              <div>
                <strong>{selected.label}</strong>
                <span>
                  {selected.district} ·{" "}
                  {selected.type === "history"
                    ? "Điểm đen lịch sử IRD (2002–2026)"
                    : selected.type === "risk"
                      ? "Điểm có nguy cơ ngập cao"
                      : selected.type === "sensor"
                        ? "Trạm đo mưa khí tượng thủy văn"
                        : severityLabel(selected.severity)}
                </span>
              </div>
              <IconButton
                label="Đóng chi tiết"
                onClick={() => onSelect(selected)}
              >
                <X size={14} />
              </IconButton>
            </div>
            <div className="popover-stats">
              {selected.type === "history" ? (
                <>
                  <span>
                    <b>{selected.historyCount} lần</b>Số lần ngập
                  </span>
                  <span>
                    <b>{selected.maxDepth || selected.depth || 30} cm</b>Đỉnh ngập kỷ lục
                  </span>
                  <span>
                    <b>{selected.elevationM || 2.0} m</b>Cao độ địa hình
                  </span>
                </>
              ) : selected.type === "sensor" ? (
                <>
                  <span>
                    <b>{selected.rainfall} mm/h</b>Lượng mưa
                  </span>
                  <span>
                    <b>{selected.rainfall > 0 ? "Đang mưa" : "Tạnh ráo"}</b>Trạng thái
                  </span>
                  <span>
                    <b>{selected.elevationM || 3.0} m</b>Cao độ trạm
                  </span>
                </>
              ) : selected.type === "risk" ? (
                <>
                  <span>
                    <b>{selected.rainfall || 35} mm</b>Ngưỡng kích hoạt
                  </span>
                  <span>
                    <b>{selected.elevationM || 1.8} m</b>Cao độ trũng
                  </span>
                  <span>
                    <b>{selected.historyCount} lần</b>Lịch sử ngập
                  </span>
                </>
              ) : (
                <>
                  <span>
                    <b>
                      {selected.depth || "—"}
                      {selected.depth ? " cm" : ""}
                    </b>
                    Mực nước hiện tại
                  </span>
                  <span>
                    <b>{selected.rainfall} mm</b>Lượng mưa
                  </span>
                  <span>
                    <b>{selected.historyCount} lần</b>Lịch sử ngập
                  </span>
                </>
              )}
            </div>
            <div className="confidence-row">
              <span>
                {selected.lat && selected.lng
                  ? `GPS: ${selected.lat.toFixed(4)}, ${selected.lng.toFixed(4)}`
                  : "Độ tin cậy dữ liệu"}
              </span>
              <strong>{selected.linkedReportId ? "Báo cáo thực tế" : "Dữ liệu GIS"}</strong>
            </div>
          </div>
        )}
        <div className="map-legend">
          <strong>Chú giải phân lớp</strong>
          <span>
            <i className="legend-dot critical" /> Ngập hiện tại
          </span>
          <span>
            <i className="legend-dot" style={{ background: "var(--sun)" }} /> Nguy cơ ngập
          </span>
          <span>
            <i className="legend-dot" style={{ background: "var(--rain)" }} /> Trạm đo mưa
          </span>
          <span>
            <i className="legend-dot" style={{ background: "#8b5cf6" }} /> Lịch sử IRD
          </span>
        </div>
      </div>
    </section>
  )
}

export default OperationsMap
