import Icon from "@/components/ui/Icon"
import type { AreaAlertItem } from "@/types"

function NotificationsModal({
  open,
  mode,
  onChangeMode,
  onClose,
  alerts,
}: {
  open: boolean
  mode: "alerts" | "guide"
  onChangeMode: (next: "alerts" | "guide") => void
  onClose: () => void
  alerts: AreaAlertItem[]
}) {
  if (!open) return null

  return (
    <div
      aria-label="Cảnh báo khu vực và hướng dẫn an toàn"
      aria-modal="true"
      className="modal-backdrop"
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose()
      }}
      role="dialog"
    >
      <div className="report-modal auth-modal">
        <button
          aria-label="Đóng hộp thoại"
          className="icon-button modal-close"
          onClick={onClose}
          type="button"
        >
          <Icon name="close" size={20} />
        </button>

        <div className="modal-head">
          <span className="modal-mark">
            <Icon name={mode === "alerts" ? "bell" : "shield"} size={22} />
          </span>
          <div>
            <h2>
              {mode === "alerts"
                ? `Cảnh báo khu vực (${alerts.length})`
                : "Hướng dẫn di chuyển an toàn"}
            </h2>
            <p className="modal-intro">
              {mode === "alerts"
                ? "Thông báo khẩn cấp phát trực tiếp từ Trung tâm điều hành TP.HCM."
                : "Khuyến nghị an toàn khi di chuyển qua vùng mưa ngập và triều cường."}
            </p>
          </div>
        </div>

        <div className="auth-tabs" role="tablist">
          <button
            aria-selected={mode === "alerts"}
            className={mode === "alerts" ? "is-active" : ""}
            onClick={() => onChangeMode("alerts")}
            role="tab"
            type="button"
          >
            Cảnh báo đang phát ({alerts.length})
          </button>
          <button
            aria-selected={mode === "guide"}
            className={mode === "guide" ? "is-active" : ""}
            onClick={() => onChangeMode("guide")}
            role="tab"
            type="button"
          >
            Cẩm nang tránh ngập
          </button>
        </div>

        {mode === "alerts" ? (
          <div className="notif-alert-list">
            {alerts.length === 0 ? (
              <div className="notif-empty">
                <Icon name="check" size={24} />
                <strong>Hiện không có cảnh báo khẩn cấp</strong>
                <span>Các tuyến đường chính đang lưu thông bình thường.</span>
              </div>
            ) : (
              alerts.map((alert) => {
                const isCritical = alert.level === "Nghiêm trọng"
                return (
                  <article
                    className={`notif-alert-card ${isCritical ? "is-critical" : "is-warning"}`}
                    key={alert.id}
                  >
                    <div className="notif-alert-top">
                      <span className="notif-level-pill">{alert.level}</span>
                      <small>
                        {alert.startedAt} – {alert.expiresAt}
                      </small>
                    </div>
                    <strong>{alert.title}</strong>
                    <span className="notif-area">
                      <Icon name="pin" size={13} /> {alert.area} ·{" "}
                      {alert.hazardType}
                    </span>
                    <p>{alert.message}</p>
                  </article>
                )
              })
            )}
          </div>
        ) : (
          <div className="notif-guide-list">
            <div className="notif-guide-item">
              <strong>1. Không cố vượt điểm ngập trên 25 cm (quá nửa bánh xe)</strong>
              <p>
                Mực nước trên 25 cm dễ làm nước tràn vào ống xả và lọc gió gây
                chết máy, đồng thời che khuất ổ gà hoặc nắp cống bị bật.
              </p>
            </div>
            <div className="notif-guide-item">
              <strong>2. Ưu tiên chọn "Tuyến đề xuất" trên SaigonDrain AI</strong>
              <p>
                Thuật toán tự động đối chiếu dữ liệu mưa Open-Meteo và các điểm
                ngập cộng đồng vừa được Trung tâm điều hành xác minh để tìm
                đường vòng khô ráo.
              </p>
            </div>
            <div className="notif-guide-item">
              <strong>3. Giữ khoảng cách và đi số thấp đều ga</strong>
              <p>
                Với xe số, giữ số 1 hoặc 2; với xe tay ga, giữ đều tay ga và
                tránh đi sát xe tải/ô tô lớn để không bị sóng nước đánh ngã.
              </p>
            </div>
          </div>
        )}

        <button
          className="primary-modal-button"
          onClick={onClose}
          type="button"
        >
          Đã hiểu, quay lại bản đồ
        </button>
      </div>
    </div>
  )
}

export default NotificationsModal

