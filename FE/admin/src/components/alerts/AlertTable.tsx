import { BellRing, Clock3, Radio, Send } from "lucide-react"
import Button from "@/components/ui/Button"
import StatusPill from "@/components/ui/StatusPill"
import type { AlertLevel, AreaAlert } from "@/types"

const levelTone: Record<AlertLevel, "danger" | "watch" | "info"> = {
  "Nghiêm trọng": "danger",
  "Cảnh báo": "watch",
  "Theo dõi": "info",
}

function AlertTable({
  alerts,
  onEdit,
  onEnd,
  limit,
}: {
  alerts: AreaAlert[]
  onEdit: (alert: AreaAlert) => void
  onEnd: (alert: AreaAlert) => void
  limit?: number
}) {
  const visible = typeof limit === "number" ? alerts.slice(0, limit) : alerts

  if (!visible.length) {
    return (
      <div className="empty-state">
        <span className="empty-icon">
          <BellRing size={24} />
        </span>
        <strong>Không có cảnh báo</strong>
        <span>Chưa có cảnh báo nào trong nhóm này.</span>
      </div>
    )
  }

  return (
    <div className="alert-list">
      {visible.map((alert) => (
        <article className="alert-card" key={alert.id}>
          <div className="alert-card-top">
            <StatusPill
              icon={<Radio size={13} />}
              tone={levelTone[alert.level]}
            >
              {alert.level}
            </StatusPill>
            <span className="alert-status">
              <i className={alert.status} />
              {alert.status === "active" ? "Đang phát" : "Đã kết thúc"}
            </span>
          </div>
          <strong className="alert-title">{alert.title}</strong>
          <span className="alert-area">{alert.area}</span>
          <p className="alert-message">{alert.message}</p>
          <div className="alert-meta">
            <span>
              <Clock3 size={13} /> {alert.startedAt} – {alert.expiresAt}
            </span>
            <span>
              <Send size={13} /> {alert.channels.join(" · ")}
            </span>
          </div>
          {alert.status === "active" && (
            <div className="alert-actions">
              <Button variant="ghost" onClick={() => onEdit(alert)}>
                Cập nhật
              </Button>
              <Button
                className="end-action"
                onClick={() => onEnd(alert)}
                variant="ghost"
              >
                Kết thúc
              </Button>
            </div>
          )}
        </article>
      ))}
    </div>
  )
}

export default AlertTable
