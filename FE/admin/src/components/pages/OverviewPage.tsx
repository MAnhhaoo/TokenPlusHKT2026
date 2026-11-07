import { useMemo } from "react"
import { Bell, Droplets, Radar, TriangleAlert } from "lucide-react"
import Button from "@/components/ui/Button"
import FloodStatusHero from "@/components/overview/FloodStatusHero"
import MetricCard from "@/components/overview/MetricCard"
import TrendChart from "@/components/overview/TrendChart"
import OperationsMap from "@/components/map/OperationsMap"
import ReportQueue from "@/components/reports/ReportQueue"
import AlertTable from "@/components/alerts/AlertTable"
import SectionHeader from "@/components/ui/SectionHeader"
import type {
  AreaAlert,
  FloodReport,
  MapLayer,
  MapPoint,
  Page,
  Severity,
  TrendsMap,
  WeatherSnapshot,
} from "@/types"

function OverviewPage({
  reports,
  alerts,
  points,
  trendsData,
  weather,
  selectedMapPoint,
  onSelectPoint,
  layers,
  setLayers,
  severityFilter,
  setSeverityFilter,
  trendRange,
  setTrendRange,
  onNavigate,
  onReview,
  onEditAlert,
  onEndAlert,
}: {
  reports: FloodReport[]
  alerts: AreaAlert[]
  points: MapPoint[]
  trendsData: TrendsMap
  weather?: WeatherSnapshot | null
  selectedMapPoint: string | null
  onSelectPoint: (point: MapPoint) => void
  layers: MapLayer[]
  setLayers: (layers: MapLayer[]) => void
  severityFilter: "all" | Severity
  setSeverityFilter: (value: "all" | Severity) => void
  trendRange: keyof TrendsMap
  setTrendRange: (range: keyof TrendsMap) => void
  onNavigate: (page: Page) => void
  onReview: (report: FloodReport) => void
  onEditAlert: (alert: AreaAlert) => void
  onEndAlert: (alert: AreaAlert) => void
}) {
  const pendingCount = reports.filter(
    (report) => report.status === "pending",
  ).length
  const activeAlerts = alerts.filter((alert) => alert.status === "active")
  const highRiskCount = points.filter(
    (point) => point.severity !== "medium",
  ).length
  const criticalPointsCount = points.filter(
    (point) => point.severity === "critical",
  ).length
  const alertAreasCount = new Set(activeAlerts.map((a) => a.area)).size
  const totalReports = reports.filter(
    (report) => report.status !== "rejected",
  ).length

  const metrics = useMemo(
    () => [
      {
        icon: <Droplets size={20} />,
        tone: "blue",
        value: totalReports,
        label: "Tổng báo cáo ngập",
        meta: (
          <>
            <span className="trend-up">Realtime</span> cập nhật tự động
          </>
        ),
        data: [8, 11, 10, 17, 21, 19, 28],
      },
      {
        icon: <TriangleAlert size={20} />,
        tone: "red",
        value: highRiskCount,
        label: "Điểm nguy cơ cao",
        meta: (
          <>
            <span className="urgent-dot" />{" "}
            {criticalPointsCount > 0
              ? `${criticalPointsCount} điểm mức nghiêm trọng`
              : "Không có điểm nghiêm trọng"}
          </>
        ),
        data: [9, 12, 8, 15, 17, 19, 18],
      },
      {
        icon: <Radar size={20} />,
        tone: "amber",
        value: pendingCount,
        label: "Chờ xác minh",
        meta: (
          <>
            {pendingCount > 0
              ? `${pendingCount} tin cần duyệt ngay`
              : "Hàng chờ đã xử lý hết"}
          </>
        ),
        data: [16, 13, 18, 12, 10, 7, 5],
      },
      {
        icon: <Bell size={20} />,
        tone: "teal",
        value: activeAlerts.length,
        label: "Cảnh báo đang phát",
        meta: (
          <>
            {activeAlerts.length > 0
              ? `Phủ ${alertAreasCount} khu vực ảnh hưởng`
              : "Hệ thống an toàn"}
          </>
        ),
        data: [3, 4, 4, 6, 5, 7, 7],
      },
    ],
    [
      activeAlerts.length,
      alertAreasCount,
      criticalPointsCount,
      highRiskCount,
      pendingCount,
      totalReports,
    ],
  )

  return (
    <div className="page-stack">
      <FloodStatusHero
        activeAlertCount={activeAlerts.length}
        onViewAlerts={() => onNavigate("alerts")}
        onViewMap={() => onNavigate("map")}
        pendingCount={pendingCount}
        weather={weather}
      />

      <div className="metrics-grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="overview-grid">
        <TrendChart
          range={trendRange}
          setRange={setTrendRange}
          trendsData={trendsData}
        />
        <ReportQueue
          onReview={onReview}
          onViewAll={() => onNavigate("reports")}
          reports={reports}
        />
      </div>

      <div className="overview-bottom">
        <OperationsMap
          layers={layers}
          onExpand={() => onNavigate("map")}
          onSelect={onSelectPoint}
          points={points}
          reports={reports}
          selectedId={selectedMapPoint}
          setLayers={setLayers}
          setSeverityFilter={setSeverityFilter}
          severityFilter={severityFilter}
        />
        <section className="panel overview-alerts">
          <SectionHeader
            action={
              <Button variant="ghost" onClick={() => onNavigate("alerts")}>
                Xem tất cả <span>→</span>
              </Button>
            }
            description="Đang phát tới người dân trong khu vực"
            title="Cảnh báo đang hoạt động"
          />
          <AlertTable
            alerts={activeAlerts}
            limit={2}
            onEdit={onEditAlert}
            onEnd={onEndAlert}
          />
        </section>
      </div>
    </div>
  )
}

export default OverviewPage
