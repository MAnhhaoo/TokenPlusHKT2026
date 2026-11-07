import { useMemo, useState } from "react"
import {
  CheckCircle2,
  ChevronDown,
  Clock3,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import Button from "@/components/ui/Button"
import EmptyState from "@/components/ui/EmptyState"
import SectionHeader from "@/components/ui/SectionHeader"
import SegmentedControl from "@/components/ui/SegmentedControl"
import StatusPill from "@/components/ui/StatusPill"
import { severityLabel } from "@/lib/severity"
import { reportStatusCounts } from "@/lib/analytics"
import type { FloodReport, ReportStatus, Severity } from "@/types"

const HCMC_ADMIN_DISTRICTS = [
  "Quận 1",
  "Quận 3",
  "Quận 4",
  "Quận 5",
  "Quận 6",
  "Quận 7",
  "Quận 8",
  "Quận 10",
  "Quận 11",
  "Quận 12",
  "Bình Thạnh",
  "Gò Vấp",
  "Phú Nhuận",
  "Tân Bình",
  "Tân Phú",
  "Bình Tân",
  "TP. Thủ Đức",
  "Củ Chi",
  "Hóc Môn",
  "Bình Chánh",
  "Nhà Bè",
  "Cần Giờ",
]

const severityTone: Record<Severity, "danger" | "watch" | "neutral"> = {
  critical: "danger",
  high: "watch",
  medium: "neutral",
}

const statusTone: Record<
  ReportStatus,
  "watch" | "safe" | "neutral"
> = {
  pending: "watch",
  verified: "safe",
  rejected: "neutral",
}

const statusLabel: Record<ReportStatus, string> = {
  pending: "Chờ xác minh",
  verified: "Đã xác minh",
  rejected: "Từ chối",
}

function ReportsPage({
  reports,
  onReview,
}: {
  reports: FloodReport[]
  onReview: (report: FloodReport) => void
}) {
  const [status, setStatus] = useState<"all" | ReportStatus>("all")
  const [severity, setSeverity] = useState<"all" | Severity>("all")
  const [district, setDistrict] = useState("all")
  const [timeRange, setTimeRange] = useState<"all" | "today" | "3d" | "7d">("all")
  const [query, setQuery] = useState("")

  const allDistricts = useMemo(() => {
    const reportDistricts = reports.map((report) => report.district).filter(Boolean)
    const set = new Set([...HCMC_ADMIN_DISTRICTS, ...reportDistricts])
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"))
  }, [reports])

  const counts = reportStatusCounts(reports)

  const filtered = reports.filter((report) => {
    const matchesStatus = status === "all" || report.status === status
    const matchesSeverity =
      severity === "all" || report.severity === severity
    const matchesDistrict =
      district === "all" || report.district === district
    const matchesTime =
      timeRange === "all"
        ? true
        : timeRange === "today"
          ? report.minutesAgo <= 1440
          : timeRange === "3d"
            ? report.minutesAgo <= 4320
            : report.minutesAgo <= 10080
    const matchesQuery = `${report.id} ${report.location} ${report.district} ${report.description}`
      .toLowerCase()
      .includes(query.trim().toLowerCase())
    return (
      matchesStatus &&
      matchesSeverity &&
      matchesDistrict &&
      matchesTime &&
      matchesQuery
    )
  })

  return (
    <div className="page-stack">
      <SectionHeader
        description="Xác minh báo cáo hiện trường trước khi đưa lên bản đồ công khai."
        title="Hàng chờ báo cáo cộng đồng"
      />

      <div className="report-stat-row">
        <div className="report-stat">
          <Clock3 size={18} />
          <div>
            <strong>{counts.pending}</strong>
            <span>Chờ xác minh</span>
          </div>
        </div>
        <div className="report-stat">
          <CheckCircle2 size={18} />
          <div>
            <strong>{counts.verified}</strong>
            <span>Đã xác minh</span>
          </div>
        </div>
        <div className="report-stat">
          <XCircle size={18} />
          <div>
            <strong>{counts.rejected}</strong>
            <span>Đã từ chối</span>
          </div>
        </div>
        <div className="report-stat">
          <ShieldCheck size={18} />
          <div>
            <strong>{counts.total}</strong>
            <span>Tổng báo cáo</span>
          </div>
        </div>
      </div>

      <section className="panel">
        <div className="reports-toolbar">
          <SegmentedControl
            label="Lọc theo trạng thái"
            onChange={setStatus}
            options={[
              { value: "all", label: "Tất cả" },
              { value: "pending", label: "Chờ xác minh" },
              { value: "verified", label: "Đã xác minh" },
              { value: "rejected", label: "Từ chối" },
            ]}
            value={status}
          />
          <div className="user-filters">
            <label className="search-field">
              <Search size={16} />
              <input
                aria-label="Tìm báo cáo theo mã, đường hoặc quận"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm mã, đường, quận..."
                value={query}
              />
            </label>
            <label className="compact-select">
              <span className="sr-only">Lọc mức độ</span>
              <select
                onChange={(event) =>
                  setSeverity(event.target.value as "all" | Severity)
                }
                value={severity}
              >
                <option value="all">Tất cả mức độ</option>
                <option value="critical">Nghiêm trọng</option>
                <option value="high">Cao</option>
                <option value="medium">Trung bình</option>
              </select>
              <ChevronDown size={15} />
            </label>
            <label className="compact-select">
              <span className="sr-only">Lọc quận</span>
              <select
                onChange={(event) => setDistrict(event.target.value)}
                value={district}
              >
                <option value="all">Tất cả quận ({allDistricts.length})</option>
                {allDistricts.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} />
            </label>
            <label className="compact-select">
              <span className="sr-only">Lọc thời gian</span>
              <select
                onChange={(event) =>
                  setTimeRange(
                    event.target.value as "all" | "today" | "3d" | "7d",
                  )
                }
                value={timeRange}
              >
                <option value="all">Mọi thời gian</option>
                <option value="today">24 giờ qua</option>
                <option value="3d">3 ngày qua</option>
                <option value="7d">7 ngày qua</option>
              </select>
              <ChevronDown size={15} />
            </label>
          </div>
        </div>

        {filtered.length ? (
          <div className="table-wrap">
            <table className="data-table reports-table">
              <caption className="sr-only">
                Danh sách báo cáo cộng đồng, {filtered.length} báo cáo
              </caption>
              <thead>
                <tr>
                  <th>Hiện trường</th>
                  <th>Quận</th>
                  <th>Mức độ</th>
                  <th>Mực nước AI</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th>
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((report) => (
                  <tr key={report.id}>
                    <td data-label="Hiện trường">
                      <strong>{report.location}</strong>
                      <span className="cell-note">
                        {report.id} · {report.priority}
                      </span>
                    </td>
                    <td data-label="Quận">{report.district}</td>
                    <td data-label="Mức độ">
                      <StatusPill tone={severityTone[report.severity]}>
                        {severityLabel(report.severity)}
                      </StatusPill>
                    </td>
                    <td data-label="Mực nước AI">
                      <strong>{report.aiDepth} cm</strong>
                      <span className="cell-note">
                        AI tin cậy {report.aiConfidence}%
                      </span>
                    </td>
                    <td data-label="Thời gian">
                      {report.minutesAgo} phút trước
                    </td>
                    <td data-label="Trạng thái">
                      <StatusPill tone={statusTone[report.status]}>
                        {statusLabel[report.status]}
                      </StatusPill>
                    </td>
                    <td data-label="Thao tác">
                      {report.status === "pending" ? (
                        <Button
                          variant="secondary"
                          onClick={() => onReview(report)}
                        >
                          Xác minh
                        </Button>
                      ) : (
                        <span className="cell-note">Đã xử lý</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            description="Thử thay đổi từ khóa hoặc bộ lọc mức độ, quận, thời gian."
            icon={<Search size={24} />}
            title="Không có báo cáo phù hợp"
          />
        )}
      </section>
    </div>
  )
}

export default ReportsPage
