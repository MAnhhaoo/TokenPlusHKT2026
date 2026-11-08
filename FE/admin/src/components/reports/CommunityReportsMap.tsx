import { useState, useMemo } from "react"
import {
  Lock,
  Unlock,
  Eye,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  Droplets,
  AlertTriangle,
  X,
} from "lucide-react"
import Button from "@/components/ui/Button"
import IconButton from "@/components/ui/IconButton"
import StatusPill from "@/components/ui/StatusPill"
import { severityLabel } from "@/lib/severity"
import type { FloodReport, Severity } from "@/types"

const CENTER_LAT = 10.776
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

type BasemapStyle = "streets" | "satellite"

function getTileUrl(
  style: BasemapStyle,
  tx: number,
  ty: number,
  z: number,
): string {
  if (style === "satellite") {
    return `https://mt${Math.abs(tx + ty) % 4}.google.com/vt/lyrs=y&hl=vi&x=${tx}&y=${ty}&z=${z}`
  }
  return `https://mt${Math.abs(tx + ty) % 4}.google.com/vt/lyrs=m&hl=vi&x=${tx}&y=${ty}&z=${z}`
}

const severityTone: Record<Severity, "danger" | "watch" | "neutral"> = {
  critical: "danger",
  high: "watch",
  medium: "neutral",
}

interface CommunityReportsMapProps {
  reports: FloodReport[]
  selectedReportId: string | null
  onSelectReport: (report: FloodReport | null) => void
  onToggleLock: (report: FloodReport) => void
  onReview: (report: FloodReport) => void
}

export default function CommunityReportsMap({
  reports,
  selectedReportId,
  onSelectReport,
  onToggleLock,
  onReview,
}: CommunityReportsMapProps) {
  const [zoom, setZoom] = useState(12)
  const [center, setCenter] = useState<{ lat: number; lng: number }>({
    lat: CENTER_LAT,
    lng: CENTER_LNG,
  })
  const [mapStyle, setMapStyle] = useState<BasemapStyle>("streets")
  const [filterMode, setFilterMode] = useState<"all" | "active" | "locked">("all")

  // Tính tọa độ cho từng báo cáo cộng đồng
  const reportsWithCoords = useMemo(() => {
    return reports.map((r) => {
      let lat = CENTER_LAT
      let lng = CENTER_LNG
      if (r.coordinates && r.coordinates.includes(",")) {
        const parts = r.coordinates.split(",").map((s) => Number(s.trim()))
        if (Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
          lat = parts[0]
          lng = parts[1]
        }
      }
      return { ...r, parsedLat: lat, parsedLng: lng }
    })
  }, [reports])

  const filteredReports = useMemo(() => {
    if (filterMode === "locked") {
      return []
    }
    return reportsWithCoords.filter((r) => r.status !== "rejected")
  }, [reportsWithCoords, filterMode])

  const selectedReport = useMemo(() => {
    return filteredReports.find((r) => r.id === selectedReportId) ?? null
  }, [filteredReports, selectedReportId])

  const counts = useMemo(() => {
    const total = reports.length
    const active = reports.filter((r) => r.status !== "rejected").length
    const locked = reports.filter((r) => r.status === "rejected").length
    return { total, active, locked }
  }, [reports])

  // Tính toán lưới Tile
  const centerX = lngToTileX(center.lng, zoom)
  const centerY = latToTileY(center.lat, zoom)
  const baseTileX = Math.floor(centerX) - 2
  const baseTileY = Math.floor(centerY) - 2
  const gridCols = 5
  const gridRows = 5

  const getPosition = (lat: number, lng: number) => {
    const px = (lngToTileX(lng, zoom) - centerX) * 256
    const py = (latToTileY(lat, zoom) - centerY) * 256
    return {
      left: `calc(50% + ${Math.round(px)}px)`,
      top: `calc(50% + ${Math.round(py)}px)`,
    }
  }

  const handleZoomIn = () => setZoom((z) => Math.min(16, z + 1))
  const handleZoomOut = () => setZoom((z) => Math.max(10, z - 1))
  const handleReset = () => {
    setZoom(12)
    setCenter({ lat: CENTER_LAT, lng: CENTER_LNG })
  }

  return (
    <div className="panel community-map-panel" style={{ marginBottom: "16px" }}>
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", paddingBottom: "12px" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
            <Droplets size={18} style={{ color: "var(--teal)" }} />
            Bản đồ Giám sát Điểm ngập do Người dân báo cáo
          </h3>
          <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--ink-soft)" }}>
            Hiển thị các vị trí người dân đã tải lên. Admin có quyền <strong>Khóa (Ẩn)</strong> hoặc <strong>Mở khóa (Hiển thị)</strong> trực tiếp trên bản đồ.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {/* Bộ lọc trạng thái trên bản đồ */}
          <div className="layer-bar" style={{ margin: 0 }}>
            <button
              type="button"
              className={`layer-btn ${filterMode === "all" ? "is-active" : ""}`}
              onClick={() => setFilterMode("all")}
            >
              <span className="layer-btn-label">Tất cả ({counts.total})</span>
            </button>
            <button
              type="button"
              className={`layer-btn ${filterMode === "active" ? "is-active" : ""}`}
              onClick={() => setFilterMode("active")}
            >
              <span className="layer-btn-icon"><Sparkles size={13} style={{ color: "#10b981" }} /></span>
              <span className="layer-btn-label">Đang mở ({counts.active})</span>
            </button>
            <button
              type="button"
              className={`layer-btn ${filterMode === "locked" ? "is-active" : ""}`}
              onClick={() => setFilterMode("locked")}
            >
              <span className="layer-btn-icon"><Lock size={13} style={{ color: "#ef4444" }} /></span>
              <span className="layer-btn-label">Đã khóa ({counts.locked})</span>
            </button>
          </div>

          {/* Điều khiển Map */}
          <div style={{ display: "flex", gap: "4px" }}>
            <IconButton label="Phóng to" onClick={handleZoomIn}>
              <Plus size={14} />
            </IconButton>
            <IconButton label="Thu nhỏ" onClick={handleZoomOut}>
              <Minus size={14} />
            </IconButton>
            <IconButton label="Về trung tâm TP.HCM" onClick={handleReset}>
              <RotateCcw size={14} />
            </IconButton>
            <button
              type="button"
              className="layer-btn"
              onClick={() => setMapStyle((s) => (s === "streets" ? "satellite" : "streets"))}
              style={{ fontSize: "11px", padding: "4px 8px" }}
            >
              {mapStyle === "streets" ? "🛰️ Vệ tinh" : "🗺️ Đường phố"}
            </button>
          </div>
        </div>
      </div>

      <div className="map-canvas is-osm" style={{ minHeight: "380px", position: "relative", borderRadius: "12px", overflow: "hidden" }}>
        {/* Lớp Tiles OSM / Google */}
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
        </div>

        {/* Các điểm ngập do người dân báo cáo */}
        {filteredReports.map((report) => {
          const pos = getPosition(report.parsedLat, report.parsedLng)
          const isSelected = selectedReportId === report.id
          const isPending = report.status === "pending"

          const markerBg = report.severity === "critical"
              ? "#dc2626"
              : report.severity === "high"
                ? "#d97706"
                : "#0f766e"

          return (
            <button
              key={report.id}
              className={`map-marker ${isSelected ? "selected" : ""}`}
              style={{
                position: "absolute",
                left: pos.left,
                top: pos.top,
                transform: "translate(-50%, -50%)",
                background: markerBg,
                color: "#ffffff",
                border: isSelected ? "2.5px solid #ffffff" : "1.5px solid #ffffff",
                boxShadow: isSelected
                  ? "0 0 0 4px rgba(11, 79, 74, 0.45), 0 8px 20px rgba(0,0,0,0.3)"
                  : "0 4px 10px rgba(0,0,0,0.25)",
                borderRadius: "999px",
                padding: "3px 8px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                cursor: "pointer",
                zIndex: isSelected ? 40 : 25,
                fontSize: "11px",
                fontWeight: 700,
              }}
              onClick={() => onSelectReport(isSelected ? null : report)}
              type="button"
              title={`${report.location} (${report.district}) · ${report.status === "verified" ? "Đã xác minh" : "Chờ duyệt"}`}
            >
              <span>
                {isPending ? (
                  <AlertTriangle size={12} />
                ) : (
                  <Droplets size={12} />
                )}
              </span>
              <span>{report.location.split(",")[0].trim()}</span>
            </button>
          )
        })}

        {/* Thẻ Chi tiết & Thao tác Khóa/Mở khi click vào Marker */}
        {selectedReport && (
          <div
            className="community-report-popup"
            style={{
              position: "absolute",
              bottom: "16px",
              left: "16px",
              maxWidth: "340px",
              background: "rgba(255, 255, 255, 0.96)",
              backdropFilter: "blur(8px)",
              border: "1px solid var(--line)",
              borderRadius: "14px",
              padding: "14px 16px",
              boxShadow: "0 12px 30px rgba(15, 23, 42, 0.22)",
              zIndex: 50,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
              <div>
                <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase" }}>
                  Báo cáo {selectedReport.id} · {selectedReport.district}
                </span>
                <h4 style={{ margin: "2px 0 0 0", fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>
                  {selectedReport.location}
                </h4>
              </div>
              <IconButton label="Đóng" onClick={() => onSelectReport(null)}>
                <X size={14} />
              </IconButton>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
              <StatusPill tone={severityTone[selectedReport.severity]}>
                {severityLabel(selectedReport.severity)}
              </StatusPill>
              <StatusPill tone={selectedReport.status === "rejected" ? "neutral" : selectedReport.status === "verified" ? "safe" : "watch"}>
                {selectedReport.status === "rejected"
                  ? "🔒 Đã khóa / Ẩn"
                  : selectedReport.status === "verified"
                    ? "✓ Đã xác minh"
                    : "⏳ Chờ duyệt"}
              </StatusPill>
              <span style={{ fontSize: "11px", color: "var(--ink-soft)", marginLeft: "auto" }}>
                {selectedReport.minutesAgo} phút trước
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11.5px", background: "var(--mist)", padding: "8px 10px", borderRadius: "8px", marginBottom: "10px" }}>
              <div>
                <span style={{ color: "var(--ink-soft)" }}>Loại sự cố: </span>
                <strong>{selectedReport.priority || "Ngập mặt đường"}</strong>
              </div>
              <div>
                <span style={{ color: "var(--ink-soft)" }}>Lịch sử: </span>
                <strong>{selectedReport.historyCount || 1} lần</strong>
              </div>
            </div>

            {selectedReport.aiSummary && (
              <p style={{ margin: "0 0 10px 0", fontSize: "11.5px", color: "var(--ink)", lineHeight: 1.45, background: "#f8fafc", padding: "6px 8px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                <strong>AI Gemini:</strong> {selectedReport.aiSummary}
              </p>
            )}

            {/* Thao tác Khóa / Mở trực tiếp trên bản đồ */}
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              {selectedReport.status === "rejected" ? (
                <Button
                  variant="secondary"
                  onClick={() => onToggleLock(selectedReport)}
                  style={{ flex: 1 }}
                >
                  <Unlock size={14} /> Mở khóa điểm ngập
                </Button>
              ) : selectedReport.status === "pending" ? (
                <>
                  <Button
                    variant="primary"
                    onClick={() => onToggleLock(selectedReport)}
                    style={{ flex: 1 }}
                  >
                    <Sparkles size={14} /> Duyệt & Mở
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => onReview(selectedReport)}
                    style={{ flex: 1 }}
                  >
                    <Lock size={14} /> Khóa
                  </Button>
                </>
              ) : (
                <Button
                  variant="danger"
                  onClick={() => onToggleLock(selectedReport)}
                  style={{ flex: 1 }}
                >
                  <Lock size={14} /> Khóa điểm ngập
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => onReview(selectedReport)}
              >
                <Eye size={14} /> Chi tiết
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
