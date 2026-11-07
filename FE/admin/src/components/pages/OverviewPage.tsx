import { useMemo } from "react"
import { Droplets, Sparkles, TriangleAlert, Users } from "lucide-react"
import Button from "@/components/ui/Button"
import FloodStatusHero from "@/components/overview/FloodStatusHero"
import MetricCard from "@/components/overview/MetricCard"
import TrendChart from "@/components/overview/TrendChart"
import OperationsMap from "@/components/map/OperationsMap"
import ReportQueue from "@/components/reports/ReportQueue"
import SectionHeader from "@/components/ui/SectionHeader"
import { topContributors } from "@/lib/analytics"
import type {
  CommunityUser,
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
  users = [],
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
}: {
  reports: FloodReport[]
  users?: CommunityUser[]
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
}) {
  const verifiedCount = reports.filter(
    (report) => report.status === "verified",
  ).length
  const highRiskCount = points.filter(
    (point) => point.severity !== "medium",
  ).length
  const criticalPointsCount = points.filter(
    (point) => point.severity === "critical",
  ).length
  const totalReports = reports.filter(
    (report) => report.status !== "rejected",
  ).length
  const activeUsersCount = users.filter((u) => u.status === "active").length
  const contributors = useMemo(() => topContributors(users, 4), [users])

  const trendReports = trendsData?.[trendRange]?.reports?.length
    ? trendsData[trendRange].reports
    : [0, totalReports]

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
        data: trendReports,
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
      },
      {
        icon: <Sparkles size={20} />,
        tone: "teal",
        value: verifiedCount,
        label: "Báo cáo AI duyệt",
        meta: (
          <>
            <span className="urgent-dot" style={{ background: "#10b981" }} />{" "}
            {verifiedCount > 0
              ? `${verifiedCount} báo cáo đang phát trực tiếp`
              : "Chưa có báo cáo mới"}
          </>
        ),
      },
      {
        icon: <Users size={20} />,
        tone: "teal",
        value: users.length,
        label: "Thành viên cộng đồng",
        meta: (
          <>
            <span className="urgent-dot" style={{ background: "#10b981" }} />{" "}
            {activeUsersCount > 0
              ? `${activeUsersCount} tài khoản hoạt động`
              : "Hệ thống an toàn"}
          </>
        ),
      },
    ],
    [
      activeUsersCount,
      criticalPointsCount,
      highRiskCount,
      trendReports,
      users.length,
      verifiedCount,
      totalReports,
    ],
  )

  return (
    <div className="page-stack">
      <FloodStatusHero
        onViewReports={() => onNavigate("reports")}
        onViewMap={() => onNavigate("map")}
        pendingCount={verifiedCount}
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
        <section className="panel contributors-panel" style={{ margin: 0 }}>
          <SectionHeader
            action={
              <Button variant="ghost" onClick={() => onNavigate("users")}>
                Xem tất cả <span>→</span>
              </Button>
            }
            description="Thành viên tích cực báo cáo và hỗ trợ thẩm định ngập"
            title="Đóng góp cộng đồng nổi bật"
          />
          <div className="contributor-list">
            {contributors.map((user, index) => (
              <div className="contributor-row" key={user.id}>
                <span className="rank">{index + 1}</span>
                <span className="table-avatar">{user.initials}</span>
                <div className="contributor-info">
                  <strong>{user.name}</strong>
                  <span>
                    {user.district} · {user.verifiedReports}/{user.reports} báo cáo đã xác minh
                  </span>
                </div>
                <div className="contributor-score">
                  <strong>{user.trustScore}</strong>
                  <span>điểm tin cậy</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default OverviewPage
