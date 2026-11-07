import type { RouteId } from "@/types"

function MapLegend({ selectedRoute }: { selectedRoute: RouteId }) {
  return (
    <aside aria-label="Chú giải bản đồ" className="map-legend">
      <strong>Chú giải</strong>
      <span className={`legend-row ${selectedRoute === "safe" ? "is-current" : ""}`}>
        <i className="legend-line safe" />
        Tuyến đề xuất
      </span>
      <span
        className={`legend-row ${selectedRoute === "balanced" ? "is-current" : ""}`}
      >
        <i className="legend-line balanced" />
        Tuyến dự phòng
      </span>
      <span className="legend-row">
        <i className="legend-dot flood" />
        Điểm ngập cần tránh
      </span>
    </aside>
  )
}

export default MapLegend
