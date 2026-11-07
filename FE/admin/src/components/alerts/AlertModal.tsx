import { useState } from "react"
import { AlertTriangle, Check, ShieldPlus } from "lucide-react"
import Button from "@/components/ui/Button"
import Field from "@/components/ui/Field"
import ModalShell from "@/components/ui/ModalShell"
const emptyDraft: AlertDraft = {
  area: "",
  level: "Cảnh báo",
  hazardType: "Ngập đường",
  title: "",
  message: "",
  expiresAt: "21:00",
  channels: ["Web", "Push"],
}
import type { AlertLevel, AreaAlert, AlertDraft } from "@/types"

function AlertModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: AreaAlert
  onClose: () => void
  onSave: (draft: AlertDraft) => void
}) {
  const [draft, setDraft] = useState<AlertDraft>(
    initial
      ? {
          area: initial.area,
          level: initial.level,
          hazardType: initial.hazardType,
          title: initial.title,
          message: initial.message,
          expiresAt: initial.expiresAt,
          channels: initial.channels,
        }
      : emptyDraft,
  )
  const [submitted, setSubmitted] = useState(false)
  const errors = {
    area: !draft.area ? "Vui lòng chọn khu vực." : "",
    title: !draft.title.trim() ? "Vui lòng nhập tiêu đề." : "",
    message: !draft.message.trim() ? "Vui lòng nhập nội dung cảnh báo." : "",
  }
  const valid = !Object.values(errors).some(Boolean)

  const submit = () => {
    setSubmitted(true)
    if (valid) onSave(draft)
  }

  return (
    <ModalShell
      title={initial ? "Cập nhật cảnh báo" : "Tạo cảnh báo khu vực"}
      subtitle={
        initial
          ? `Đang chỉnh sửa ${initial.id}`
          : "Phát thông tin đến người dân và trung tâm điều hành"
      }
      onClose={onClose}
    >
      <div className="alert-form">
        <div className="form-row">
          <Field label="Khu vực" error={submitted ? errors.area : ""}>
            <select
              className="form-control"
              value={draft.area}
              onChange={(e) => setDraft({ ...draft, area: e.target.value })}
            >
              <option value="">Chọn khu vực cảnh báo</option>
              <option>Nguyễn Hữu Cảnh, Bình Thạnh</option>
              <option>Thảo Điền, TP. Thủ Đức</option>
              <option>Huỳnh Tấn Phát, Quận 7</option>
              <option>Nguyễn Văn Quá, Quận 12</option>
              <option>Nguyễn Văn Linh, Bình Chánh</option>
            </select>
          </Field>
          <Field label="Cấp độ">
            <select
              className="form-control"
              value={draft.level}
              onChange={(e) =>
                setDraft({ ...draft, level: e.target.value as AlertLevel })
              }
            >
              <option>Theo dõi</option>
              <option>Cảnh báo</option>
              <option>Nghiêm trọng</option>
            </select>
          </Field>
        </div>
        <div className="form-row">
          <Field label="Loại nguy cơ">
            <select
              className="form-control"
              value={draft.hazardType}
              onChange={(e) =>
                setDraft({ ...draft, hazardType: e.target.value })
              }
            >
              <option>Ngập đường</option>
              <option>Mưa lớn</option>
              <option>Cống tắc</option>
              <option>Triều cường</option>
            </select>
          </Field>
          <Field label="Hiệu lực đến">
            <input
              className="form-control"
              type="time"
              value={draft.expiresAt}
              onChange={(e) =>
                setDraft({ ...draft, expiresAt: e.target.value })
              }
            />
          </Field>
        </div>
        <Field label="Tiêu đề cảnh báo" error={submitted ? errors.title : ""}>
          <input
            className="form-control"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Ví dụ: Ngập sâu, hạn chế di chuyển"
          />
        </Field>
        <Field
          label="Thông điệp cho người dân"
          error={submitted ? errors.message : ""}
        >
          <textarea
            className="form-control"
            rows={3}
            value={draft.message}
            onChange={(e) => setDraft({ ...draft, message: e.target.value })}
            placeholder="Mô tả tình trạng và hướng dẫn an toàn..."
          />
        </Field>
        <div className="channel-field">
          <span className="field-label">Kênh phát hành</span>
          <div className="channel-list">
            {["Web", "Push", "Trung tâm điều hành"].map((channel) => (
              <label
                key={channel}
                className={draft.channels.includes(channel) ? "checked" : ""}
              >
                <input
                  type="checkbox"
                  checked={draft.channels.includes(channel)}
                  onChange={() =>
                    setDraft({
                      ...draft,
                      channels: draft.channels.includes(channel)
                        ? draft.channels.filter((item) => item !== channel)
                        : [...draft.channels, channel],
                    })
                  }
                />
                <span>
                  <Check size={13} />
                </span>
                {channel}
              </label>
            ))}
          </div>
        </div>
        <div
          className={`alert-preview ${
            draft.level === "Nghiêm trọng" ? "critical" : ""
          }`}
        >
          <span>
            <AlertTriangle size={18} />
          </span>
          <div>
            <small>XEM TRƯỚC THÔNG BÁO · {draft.level.toUpperCase()}</small>
            <strong>
              {draft.title || "Tiêu đề cảnh báo sẽ hiển thị tại đây"}
            </strong>
            <p>
              {draft.message || "Nội dung hướng dẫn an toàn cho người dân."}
            </p>
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <span />
        <div>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={submit}>
            <ShieldPlus size={16} />{" "}
            {initial ? "Lưu thay đổi" : "Phát cảnh báo"}
          </Button>
        </div>
      </div>
    </ModalShell>
  )
}


export default AlertModal
