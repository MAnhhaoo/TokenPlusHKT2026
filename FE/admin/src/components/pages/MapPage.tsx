import { useState } from "react"
import { Droplets, Filter, History, MapPin, Radar } from "lucide-react"
import OperationsMap from "@/components/map/OperationsMap"
import SectionHeader from "@/components/ui/SectionHeader"
import StatusPill from "@/components/ui/StatusPill"
import type { FloodReport, MapLayer, MapPoint, Severity } from "@/types"

function MapPage({
  reports,
  points,
  selectedMapPoint,
  onSelectPoint,
  layers,
  setLayers,
  severityFilter,
  setSeverityFilter,
}: {
  reports: FloodReport[]
  points: MapPoint[]
  selectedMapPoint: string | null
  onSelectPoint: (point: MapPoint) => void
  layers: MapLayer[]
  setLayers: (layers: MapLayer[]) => void
  severityFilter: "all" | Severity
  setSeverityFilter: (value: "all" | Severity) => void
}) {
  const [districtFilter, setDistrictFilter] = useState<string>("all")

  // Danh sách các quận/huyện có điểm trên bản đồ
  const districts = Array.from(
    new Set(points.map((p) => p.district).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "vi"))

  // Lọc điểm theo quận huyện được chọn
  const filteredPoints = points.filter((p) => {
    if (districtFilter !== "all" && p.district !== districtFilter) {
      return false
    }
    return true
  })

  const floodPointsCount = filteredPoints.filter(
    (point) =>
      (point.type === "flood" || point.type === "pending") &&
      (point.depth || 0) > 0,
  ).length
  const riskPointsCount = filteredPoints.filter(
    (point) => point.type === "risk",
  ).length
  const historyPointsCount = filteredPoints.filter(
    (point) => point.type === "history",
  ).length

  return (
    <div className="page-stack">
      <SectionHeader
        action={
          <StatusPill tone="safe">
            Chẩn đoán Realtime AI
          </StatusPill>
        }
        description="Giám sát ngập lụt đô thị TP.HCM kết hợp thời tiết thực và 425 quan trắc lịch sử 24 năm."
        title="Bản đồ Tác nghiệp & Điều hành"
      />

      {/* Thanh Giám sát & Bộ lọc theo Quận/Huyện */}
      <div className="panel map-mode-bar">
        <div className="map-monitor-bar">
          <div className="map-monitor-badge">
            <span className="live-dot" />
            <span>⚡ Giám sát</span>
          </div>

          <div className="map-monitor-filters">
            <span className="filter-label">
              <Filter size={14} /> Lọc quận/huyện:
            </span>
            <div className="district-filter-wrap">
              <select
                className="district-select"
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                aria-label="Lọc theo quận/huyện"
              >
                <option value="all">
                  Tất cả quận/huyện ({districts.length})
                </option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="map-stat-row">
        <div className="map-stat">
          <span className="map-stat-icon teal">
            <MapPin size={18} />
          </span>
          <div>
            <strong>{filteredPoints.length}</strong>
            <span>Điểm đang hiển thị</span>
          </div>
        </div>
        <div className="map-stat">
          <span className="map-stat-icon coral">
            <Droplets size={18} />
          </span>
          <div>
            <strong>{floodPointsCount}</strong>
            <span>Điểm ngập hiện tại</span>
          </div>
        </div>
        <div className="map-stat">
          <span className="map-stat-icon sun">
            <Radar size={18} />
          </span>
          <div>
            <strong>{riskPointsCount}</strong>
            <span>Điểm nguy cơ cao</span>
          </div>
        </div>
        <div className="map-stat">
          <span
            className="map-stat-icon"
            style={{
              background: "rgba(139, 92, 246, 0.15)",
              color: "#7c3aed",
            }}
          >
            <History size={18} />
          </span>
          <div>
            <strong>{historyPointsCount}</strong>
            <span>Điểm đen lịch sử IRD</span>
          </div>
        </div>
      </div>

      <OperationsMap
        layers={layers}
        onSelect={onSelectPoint}
        points={filteredPoints}
        reports={reports}
        selectedId={selectedMapPoint}
        setLayers={setLayers}
        setSeverityFilter={setSeverityFilter}
        severityFilter={severityFilter}
        variant="full"
      />

      <section className="panel map-guide">
        <SectionHeader
          description="Màu sắc luôn đi kèm nhãn chữ để không phụ thuộc vào thị giác màu."
          title="Cách đọc bản đồ tác nghiệp"
        />
        <div className="guide-grid">
          <div>
            <i className="legend-dot critical" />
            <strong>Nghiêm trọng (Đỏ)</strong>
            <span>
              Mực nước trên 35 cm, xe máy chết máy, cần điều tiết giao thông.
            </span>
          </div>
          <div>
            <i className="legend-dot high" />
            <strong>Cảnh báo cao (Cam)</strong>
            <span>Mực nước 20 – 35 cm, phương tiện gầm thấp khó lưu thông.</span>
          </div>
          <div>
            <i className="legend-dot medium" />
            <strong>Ngập nhẹ (Vàng)</strong>
            <span>Mực nước 10 – 20 cm, di chuyển chậm được.</span>
          </div>
          <div>
            <i className="legend-dot" style={{ background: "#7c3aed" }} />
            <strong>Lịch sử ngập IRD (Tím)</strong>
            <span>
              250 điểm đen ngập kinh niên qua 24 năm quan trắc khoa học (2002–2026).
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}

export default MapPage
