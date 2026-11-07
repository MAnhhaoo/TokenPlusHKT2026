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

type BasemapStyle = "streets" | "satellite" | "terrain"
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

  const scale = 1 + (zoom - 12) * 0.16
  function getPointPosition(point: MapPoint) {
    return { left: 50 + (point.x - 50) * scale, top: 50 + (point.y - 50) * scale }
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
            Dữ liệu mô phỏng & điểm lịch sử minh họa ·{" "}
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
        <svg className={`mock-basemap mock-basemap-${mapStyle}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <g transform={`translate(50 50) scale(${scale}) translate(-50 -50)`}>
            <rect x="-100" y="-100" width="300" height="300" fill="var(--map-land)" />
            <path d="M-20 20 Q20 -10 38 32 T100 50 M-10 80 Q38 45 80 90" stroke="var(--map-park)" strokeWidth="16" fill="none" />
            <path d="M65 -30 C90 5 48 25 69 48 S42 78 66 130" stroke="var(--map-river)" strokeWidth="7" fill="none" />
            <g stroke="var(--map-road)" strokeWidth="1.4" fill="none">
              {[10,25,40,55,70,85].map(v=><path key={v} d={`M-20 ${v} L120 ${v+12} M${v} -20 L${v-12} 120`} />)}
              <path d="M-20 85 L110 10 M-10 5 L110 95" strokeWidth="2.5" />
            </g>
            <g fill="var(--ink-soft)" fontSize="3" textAnchor="middle">
              <text x="30" y="20">BÌNH THẠNH</text><text x="80" y="30">THỦ ĐỨC</text>
              <text x="35" y="53">QUẬN 1</text><text x="43" y="87">QUẬN 7</text>
            </g>
          </g>
        </svg>
        <span className="mock-map-note">BẢN ĐỒ MINH HỌA · KHÔNG DÙNG CHỈ ĐƯỜNG</span>

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
              <strong>{selected.linkedReportId ? "Báo cáo mô phỏng" : "Dữ liệu mô phỏng"}</strong>
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
