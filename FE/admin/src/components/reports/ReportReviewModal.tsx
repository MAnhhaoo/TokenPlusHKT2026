import { useMemo } from "react"
import { AlertTriangle, Check, CircleUserRound, Info, MapPin, Sparkles, XCircle } from "lucide-react"
import Button from "@/components/ui/Button"
import Heading from "@/components/ui/Heading"
import ReportVisual from "@/components/reports/ReportVisual"
import ModalShell from "@/components/ui/ModalShell"
import { severityLabel } from "@/lib/severity"
import type { FloodReport } from "@/types"

function parseCoords(coordStr?: string): [number, number] | null {
  if (!coordStr) return null
  const parts = coordStr.split(",").map((s) => parseFloat(s.trim()))
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return [parts[0], parts[1]]
  }
  return null
}

function haversineDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

interface DuplicateMatch {
  report: FloodReport
  distanceM: number
  timeDiffMin: number
}

function ReportReviewModal({
  report,
  reports = [],
  onClose,
  onApprove,
  onReject,
}: {
  report: FloodReport
  reports?: FloodReport[]
  onClose: () => void
  onApprove: () => void
  onReject: () => void
}) {
  const duplicates = useMemo<DuplicateMatch[]>(() => {
    if (!reports || reports.length === 0) return []
    const coords1 = parseCoords(report.coordinates)
    const matches: DuplicateMatch[] = []

    for (const other of reports) {
      if (other.id === report.id) continue
      const coords2 = parseCoords(other.coordinates)
      let dist = -1

      if (coords1 && coords2) {
        dist = haversineDistanceM(coords1[0], coords1[1], coords2[0], coords2[1])
      } else if (
        other.district.toLowerCase() === report.district.toLowerCase() &&
        other.location.toLowerCase() === report.location.toLowerCase()
      ) {
        dist = 50
      }

      const timeDiff = Math.abs(report.minutesAgo - other.minutesAgo)
      // Flag if within 250m and within 180 minutes of each other
      if (dist >= 0 && dist <= 250 && timeDiff <= 180) {
        matches.push({
          report: other,
          distanceM: Math.round(dist),
          timeDiffMin: timeDiff,
        })
      }
    }
    return matches.sort((a, b) => a.distanceM - b.distanceM)
  }, [report, reports])

  return (
    <ModalShell
      title="Xác minh báo cáo hiện trường"
      subtitle={`${report.id} · Gửi ${report.minutesAgo} phút trước`}
      onClose={onClose}
      wide
    >
      <div className="review-grid">
        <div className="review-media">
          <ReportVisual type={report.visual} large photoUrl={report.photoUrl} />
          <div className="image-badge">
            <Sparkles size={14} /> AI đã phân tích ảnh
          </div>
        </div>
        <div className="review-content">
          <div className="location-head">
            <div className="location-icon">
              <MapPin size={20} />
            </div>
            <div>
              <Heading level={3}>{report.location}</Heading>
              <p>
                {report.district} · {report.coordinates}
              </p>
            </div>
            <span className={`severity-pill ${report.severity}`}>
              {severityLabel(report.severity)}
            </span>
          </div>
          <div className="report-description">“{report.description}”</div>
          <div className="ai-card">
            <div className="ai-card-head">
              <span>
                <Sparkles size={16} /> Kết quả phân tích AI
              </span>
              <strong>{report.aiConfidence}% tin cậy</strong>
            </div>
            <div className="ai-stats">
              <span>
                <small>Mức nước ước tính</small>
                <b>{report.aiDepth} cm</b>
              </span>
              <span>
                <small>Loại sự cố</small>
                <b>{report.priority}</b>
              </span>
              <span>
                <small>Lịch sử khu vực</small>
                <b>{report.historyCount} lần ngập</b>
              </span>
            </div>
          </div>
          {duplicates.length > 0 ? (
            <div className="duplicate-note">
              <AlertTriangle size={17} />
              <div>
                <strong>Cảnh báo khả năng trùng lặp ({duplicates.length} báo cáo lân cận)</strong>
                <span>
                  Trùng với {duplicates[0].report.id} ({duplicates[0].report.location}), cách ~{duplicates[0].distanceM} m (cách nhau {duplicates[0].timeDiffMin} phút).
                  {duplicates.length > 1 && ` Và ${duplicates.length - 1} báo cáo khác trong bán kính 250m.`}
                </span>
              </div>
            </div>
          ) : (
            <div className="duplicate-note" style={{ background: "rgba(16, 185, 129, 0.08)", borderColor: "rgba(16, 185, 129, 0.25)" }}>
              <Info size={17} style={{ color: "#10b981" }} />
              <div>
                <strong style={{ color: "#10b981" }}>Không phát hiện trùng lặp</strong>
                <span>Vị trí và thời điểm này chưa có báo cáo khác trong bán kính 250m.</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="modal-footer">
        <span className="reporter-note">
          <CircleUserRound size={16} /> Người gửi đã được ẩn danh
        </span>
        <div>
          <Button variant="danger" onClick={onReject}>
            <XCircle size={16} /> Từ chối
          </Button>
          <Button onClick={onApprove}>
            <Check size={16} /> Xác nhận báo cáo
          </Button>
        </div>
      </div>
    </ModalShell>
  )
}

export default ReportReviewModal
