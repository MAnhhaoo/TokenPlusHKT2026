import { useState } from "react"
import { AlertTriangle } from "lucide-react"
import Button from "@/components/ui/Button"
import Field from "@/components/ui/Field"
import ModalShell from "@/components/ui/ModalShell"

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
  withReason = false,
}: {
  title: string
  description: string
  confirmLabel: string
  onClose: () => void
  onConfirm: (reason?: string) => void
  withReason?: boolean
}) {
  const [reason, setReason] = useState("")
  return (
    <ModalShell title={title} subtitle={description} onClose={onClose}>
      <div className="confirm-body">
        <span className="confirm-icon">
          <AlertTriangle size={24} />
        </span>
        {withReason ? (
          <Field label="Lý do từ chối">
            <select
              className="form-control"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="">Chọn lý do</option>
              <option>Ảnh không rõ hoặc không liên quan</option>
              <option>Thông tin vị trí không chính xác</option>
              <option>Báo cáo trùng lặp</option>
              <option>Không đủ căn cứ xác minh</option>
            </select>
          </Field>
        ) : (
          <p className="confirm-note">
            Hành động này sẽ cập nhật ngay dữ liệu vận hành và không thể hoàn
            tác.
          </p>
        )}
      </div>
      <div className="modal-footer">
        <span />
        <div>
          <Button variant="secondary" onClick={onClose}>
            Quay lại
          </Button>
          <Button
            variant="danger"
            disabled={withReason && !reason}
            onClick={() => onConfirm(reason)}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </ModalShell>
  )
}


export default ConfirmDialog
