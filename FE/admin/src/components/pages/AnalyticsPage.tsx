import { Droplets, Gauge, ShieldCheck, Waves } from "lucide-react"
import DistributionChart from "@/components/analytics/DistributionChart"
import TrendSummary from "@/components/analytics/TrendSummary"
import TrendChart from "@/components/overview/TrendChart"
import SectionHeader from "@/components/ui/SectionHeader"
import StatusPill from "@/components/ui/StatusPill"
import {
  averageDepth,
  districtBreakdown,
  irdCausesBreakdown,
  irdDistrictBreakdown,
  irdTopSevereStreets,
  mapPointBreakdown,
  reportStatusCounts,
  severityBreakdown,
  topContributors,
  trustBands,
  verificationRate,
} from "@/lib/analytics"
import type {
  AreaAlert,
  CommunityUser,
  FloodReport,
  MapPoint,
  TrendsMap,
} from "@/types"

function AnalyticsPage({
  reports,
  alerts,
  users,
  points,
  trendsData,
  trendRange,
  setTrendRange,
}: {
  reports: FloodReport[]
  alerts: AreaAlert[]
  users: CommunityUser[]
  points: MapPoint[]
  trendsData: TrendsMap
  trendRange: keyof TrendsMap
  setTrendRange: (range: keyof TrendsMap) => void
}) {
  const counts = reportStatusCounts(reports)
  const averageTrust = users.length
    ? Math.round(
        users.reduce((sum, user) => sum + user.trustScore, 0) / users.length,
      )
    : 0
  const contributors = topContributors(users)
  const activeAlerts = alerts.filter((alert) => alert.status === "active").length
  const rate = verificationRate(reports)

  return (
    <div className="page-stack">
      <SectionHeader
        description="Số liệu được tổng hợp từ báo cáo, cảnh báo, điểm bản đồ và hồ sơ cộng đồng hiện có."
        title="Phân tích vận hành"
      />

      <div className="analytics-kpis">
        <div className="analytics-kpi">
          <span className="kpi-icon teal">
            <Waves size={18} />
          </span>
          <div>
            <small>Tổng báo cáo</small>
            <strong>{counts.total}</strong>
            <span>{counts.pending} đang chờ xác minh</span>
          </div>
        </div>
        <div className="analytics-kpi">
          <span className="kpi-icon safe">
            <ShieldCheck size={18} />
          </span>
          <div>
            <small>Tỷ lệ xác minh</small>
            <strong>{rate === null ? "—" : `${rate}%`}</strong>
            <span>
              {rate === null
                ? "Chưa có báo cáo đã xử lý"
                : "Trên báo cáo đã xử lý"}
            </span>
          </div>
        </div>
        <div className="analytics-kpi">
          <span className="kpi-icon rain">
            <Droplets size={18} />
          </span>
          <div>
            <small>Mực nước AI trung bình</small>
            <strong>{averageDepth(reports)} cm</strong>
            <span>{severityBreakdown(reports)[0].count} điểm nghiêm trọng</span>
          </div>
        </div>
        <div className="analytics-kpi">
          <span className="kpi-icon sun">
            <Gauge size={18} />
          </span>
          <div>
            <small>Điểm tin cậy TB</small>
            <strong>{averageTrust}/100</strong>
            <span>{activeAlerts} cảnh báo đang phát</span>
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        <TrendChart
          range={trendRange}
          setRange={setTrendRange}
          trendsData={trendsData}
        />
        <TrendSummary range={trendRange} trendsData={trendsData} />
      </div>

      <div className="analytics-grid">
        <DistributionChart
          description="Tỷ trọng báo cáo theo mức độ ảnh hưởng."
          items={severityBreakdown(reports)}
          title="Phân bố mức độ báo cáo"
        />
        <DistributionChart
          description="Các quận xuất hiện nhiều nhất trong hàng chờ hiện tại."
          items={districtBreakdown(reports)}
          title="Báo cáo theo quận"
        />
      </div>

      <SectionHeader
        action={<StatusPill tone="info">Dataset 2002 – 2026 (24 năm)</StatusPill>}
        description="Số liệu 425 quan trắc thực nghiệm và 250 tuyến đường ngập lụt được chuẩn hóa từ công trình nghiên cứu Viện IRD / LMI CARE."
        title="Dữ liệu Lịch sử Ngập Đô thị TP.HCM (Viện Nghiên cứu IRD)"
      />

      <div className="analytics-grid">
        <DistributionChart
          description="Tỷ lệ 425 quan trắc thực nghiệm theo nguyên nhân gây ngập tại TP.HCM."
          items={irdCausesBreakdown()}
          title="Nguyên nhân ngập thực tế (2002–2026)"
        />
        <DistributionChart
          description="Mực nước ngập sâu nhất từng ghi nhận qua các năm (cm)."
          items={irdTopSevereStreets()}
          title="Top Tuyến đường ngập sâu kỷ lục"
        />
      </div>

      <div className="analytics-grid">
        <DistributionChart
          description="Phân bổ 250 điểm đen ngập lụt theo các đơn vị hành chính TP.HCM."
          items={irdDistrictBreakdown()}
          title="Điểm đen ngập lụt theo Quận/Huyện"
        />
        <DistributionChart
          description="Nhóm người dùng theo điểm tin cậy cộng đồng."
          items={trustBands(users).map((band) => ({
            label: band.label,
            count: band.count,
            percent: band.percent,
            key: band.key,
          }))}
          title="Phân bố điểm tin cậy cộng đồng"
        />
      </div>

      <section className="panel contributors-panel">
        <SectionHeader
          action={<StatusPill tone="safe">{users.length} tài khoản</StatusPill>}
          description="Xếp theo số báo cáo đã được xác minh."
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
                  {user.district} · {user.verifiedReports}/{user.reports} báo cáo
                  đã xác minh
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
  )
}

export default AnalyticsPage
