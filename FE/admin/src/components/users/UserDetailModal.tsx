import { AlertTriangle, Ban, CalendarDays, Droplets, FileCheck2, Mail, MapPin, Phone, RotateCcw, ShieldCheck, UserX } from "lucide-react"
import Button from "@/components/ui/Button"
import Heading from "@/components/ui/Heading"
import ModalShell from "@/components/ui/ModalShell"
import type { UserStatus, CommunityUser } from "@/types"

function UserDetailModal({
  user,
  onClose,
  onStatusChange,
}: {
  user: CommunityUser
  onClose: () => void
  onStatusChange: (status: UserStatus) => void
}) {
  const approvalRate = Math.round(
    (user.verifiedReports / Math.max(user.reports, 1)) * 100,
  )
  return (
    <ModalShell
      title="Hồ sơ người dùng"
      subtitle={`${user.id} · Tham gia ${user.joinedAt}`}
      onClose={onClose}
      wide
    >
      <div className="user-detail">
        <aside className="user-profile-card">
          <div className="profile-avatar">{user.initials}</div>
          <Heading level={3}>{user.name}</Heading>
          <span className={`user-status status-${user.status}`}>
            {user.status === "active"
              ? "Đang hoạt động"
              : user.status === "review"
                ? "Cần xem xét"
                : "Đã khóa"}
          </span>
          <div className="profile-contact">
            <span>
              <Phone size={14} /> {user.phone}
            </span>
            <span>
              <Mail size={14} /> {user.email}
            </span>
            <span>
              <MapPin size={14} /> {user.district}
            </span>
            <span>
              <CalendarDays size={14} /> Hoạt động {user.lastActive}
            </span>
          </div>
        </aside>
        <div className="user-detail-content">
          <div className="detail-heading">
            <div>
              <Heading level={3}>Chất lượng đóng góp</Heading>
              <p>Dữ liệu tổng hợp từ toàn bộ báo cáo cộng đồng</p>
            </div>
            {user.identityVerified ? (
              <span className="identity-badge verified">
                <ShieldCheck size={14} /> Đã xác thực
              </span>
            ) : (
              <span className="identity-badge">
                <AlertTriangle size={14} /> Chưa xác thực
              </span>
            )}
          </div>
          <div className="user-stat-grid">
            <div>
              <span>Tổng báo cáo</span>
              <strong>{user.reports}</strong>
            </div>
            <div>
              <span>Đã xác minh</span>
              <strong>{user.verifiedReports}</strong>
            </div>
            <div>
              <span>Tỷ lệ chính xác</span>
              <strong>{approvalRate}%</strong>
            </div>
            <div>
              <span>Cảnh cáo</span>
              <strong>{user.warnings}</strong>
            </div>
          </div>
          <div className="trust-card">
            <div className="trust-head">
              <span>Điểm tin cậy cộng đồng</span>
              <strong>{user.trustScore}/100</strong>
            </div>
            <div className="trust-track">
              <span style={{ width: `${user.trustScore}%` }} />
            </div>
            <p>
              {user.trustScore >= 85
                ? "Người dùng có lịch sử báo cáo chính xác và ổn định."
                : user.trustScore >= 60
                  ? "Nên kiểm tra kỹ các báo cáo mới trước khi đưa lên bản đồ."
                  : "Tài khoản có tỷ lệ báo cáo bị từ chối cao, cần hạn chế quyền gửi."}
            </p>
          </div>
          <div className="activity-list">
            <Heading level={3}>Hoạt động gần đây</Heading>
            <div>
              <span className="activity-icon success">
                <FileCheck2 size={15} />
              </span>
              <p>
                <strong>Báo cáo ngập được xác minh</strong>
                <span>Khu vực {user.district} · 2 giờ trước</span>
              </p>
              <b>+3 điểm</b>
            </div>
            <div>
              <span className="activity-icon">
                <Droplets size={15} />
              </span>
              <p>
                <strong>Gửi báo cáo hiện trường mới</strong>
                <span>Có ảnh và vị trí GPS · Hôm qua</span>
              </p>
              <b>Đã lưu</b>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <span className="admin-note">
          Mọi thao tác đều được lưu vào nhật ký quản trị.
        </span>
        <div>
          {user.status === "blocked" ? (
            <Button
              variant="secondary"
              onClick={() => onStatusChange("active")}
            >
              <RotateCcw size={15} /> Mở khóa tài khoản
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => onStatusChange("review")}
              >
                <UserX size={15} /> Đưa vào xem xét
              </Button>
              <Button
                variant="danger"
                onClick={() => onStatusChange("blocked")}
              >
                <Ban size={15} /> Khóa tài khoản
              </Button>
            </>
          )}
        </div>
      </div>
    </ModalShell>
  )
}


export default UserDetailModal
