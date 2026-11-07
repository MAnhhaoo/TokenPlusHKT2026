import { Droplets, Gauge, ShieldCheck } from "lucide-react"
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
  const pending = reports.filter((report) => report.status === "pending")
  return (
    <section className="panel report-panel">
      <div className="panel-heading">
        <div>
          <Heading className="panel-title">Cần xác minh</Heading>
          <p>Ưu tiên theo mức độ ảnh hưởng</p>
        </div>
        <span className="queue-count">{pending.length}</span>
      </div>
      <div className="report-list">
        {pending.length ? (
          pending.map((report) => (
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
                  <span>
                    <Gauge size={13} /> AI {report.aiConfidence}%
                  </span>
                  <span>
                    <Droplets size={13} /> ~{report.aiDepth} cm
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
            <strong>Đã xử lý toàn bộ</strong>
            <span>Không còn báo cáo chờ xác minh.</span>
          </div>
        )}
      </div>
      {onViewAll && (
        <Button className="full-button" onClick={onViewAll} variant="ghost">
          Xem tất cả báo cáo <span>→</span>
        </Button>
      )}
    </section>
  )
}

export default ReportQueue
