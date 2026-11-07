import { Droplets, Sparkles, ShieldCheck } from "lucide-react"
import Button from "@/components/ui/Button"
import Heading from "@/components/ui/Heading"
import ReportVisual from "@/components/reports/ReportVisual"
import { severityLabel } from "@/lib/severity"
import type { FloodReport } from "@/types"

function ReportQueue({
  reports,
  onReview,
  onViewAll,
}: {
  reports: FloodReport[]
  onReview: (report: FloodReport) => void
  onViewAll?: () => void
}) {
  // Hiển thị các báo cáo đang phát trực tiếp (được AI tự động duyệt, chưa bị Admin khóa)
  const activeReports = reports.filter((report) => report.status !== "rejected")

  return (
    <section className="panel report-panel">
      <div className="panel-heading">
        <div>
          <Heading className="panel-title">Báo cáo AI tự động duyệt (Live)</Heading>
          <p>Hiển thị công khai trên bản đồ · Admin có thể bấm để xem hoặc khóa</p>
        </div>
        <span className="queue-count">{activeReports.length}</span>
      </div>
      <div className="report-list">
        {activeReports.length ? (
          activeReports.map((report) => (
            <button
              className="report-item"
              key={report.id}
              onClick={() => onReview(report)}
              type="button"
            >
              <ReportVisual type={report.visual} photoUrl={report.photoUrl} />
              <div className="report-info">
                <div className="report-title-row">
                  <strong>{report.location}</strong>
                  <span className={`severity-pill ${report.severity}`}>
                    {severityLabel(report.severity)}
                  </span>
                </div>
                <span>
                  {report.district} · {report.minutesAgo} phút trước
                </span>
                <div className="report-meta-row">
                  <span style={{ color: "var(--teal)" }}>
                    <Sparkles size={13} />{" "}
                    {report.aiConfidence > 0
                      ? `AI ${report.aiConfidence}%`
                      : "Người dân gửi"}
                  </span>
                  <span>
                    <Droplets size={13} /> ~{report.aiDepth} cm
                  </span>
                  <span style={{ color: "#10b981", fontWeight: 600, fontSize: "11px" }}>
                    ● Đang hiển thị
                  </span>
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="empty-state">
            <span className="empty-icon">
              <ShieldCheck size={24} />
            </span>
            <strong>Chưa có báo cáo</strong>
            <span>Hiện chưa có báo cáo ngập nào từ người dân.</span>
          </div>
        )}
      </div>
      {onViewAll && (
        <Button className="full-button" onClick={onViewAll} variant="ghost">
          Xem và quản lý tất cả báo cáo <span>→</span>
        </Button>
      )}
    </section>
  )
}

export default ReportQueue
