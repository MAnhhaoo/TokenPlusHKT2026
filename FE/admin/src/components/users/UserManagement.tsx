import { useState } from "react"
import { ChevronDown, MoreHorizontal, Search, ShieldCheck, UserCheck, Users, UserX } from "lucide-react"
import Button from "@/components/ui/Button"
import IconButton from "@/components/ui/IconButton"
import Heading from "@/components/ui/Heading"
import type { UserStatus, CommunityUser } from "@/types"

function UserManagement({
  users,
  onSelect,
}: {
  users: CommunityUser[]
  onSelect: (user: CommunityUser) => void
}) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<"all" | UserStatus>("all")
  const filtered = users.filter((user) => {
    const matchesQuery = `${user.name} ${user.email} ${user.phone} ${user.id}`
      .toLowerCase()
      .includes(query.toLowerCase())
    return matchesQuery && (status === "all" || user.status === status)
  })
  const activeUsers = users.filter((user) => user.status === "active").length
  const trustedUsers = users.filter((user) => user.trustScore >= 85).length
  const reviewUsers = users.filter((user) => user.status === "review").length

  const activePercent =
    users.length > 0
      ? ((activeUsers / users.length) * 100).toFixed(1).replace(".", ",")
      : "0"
  const trustedPercent =
    users.length > 0 ? Math.round((trustedUsers / users.length) * 100) : 0

  return (
    <div className="users-page">
      <section className="user-summary-grid">
        <div className="user-summary-card">
          <span className="summary-icon teal">
            <Users size={20} />
          </span>
          <div>
            <span>Tổng người dùng</span>
            <strong>{users.length}</strong>
            <small>Đồng bộ từ bảng community_users ({users.length} tài khoản)</small>
          </div>
        </div>
        <div className="user-summary-card">
          <span className="summary-icon green">
            <UserCheck size={20} />
          </span>
          <div>
            <span>Đang hoạt động</span>
            <strong>{activeUsers}</strong>
            <small>{activePercent}% tổng tài khoản</small>
          </div>
        </div>
        <div className="user-summary-card">
          <span className="summary-icon blue">
            <ShieldCheck size={20} />
          </span>
          <div>
            <span>Độ tin cậy cao</span>
            <strong>{trustedUsers}</strong>
            <small>{trustedPercent}% điểm tín nhiệm cao (≥ 85)</small>
          </div>
        </div>
        <div className="user-summary-card">
          <span className="summary-icon amber">
            <UserX size={20} />
          </span>
          <div>
            <span>Cần xem xét</span>
            <strong>{reviewUsers}</strong>
            <small>
              {reviewUsers > 0
                ? `${reviewUsers} tài khoản cần kiểm duyệt`
                : "0 tài khoản vi phạm"}
            </small>
          </div>
        </div>
      </section>

      <section className="panel users-panel">
        <div className="users-toolbar">
          <div>
            <Heading className="panel-title">
              Danh sách người dùng cộng đồng
            </Heading>
            <p>Kiểm soát hồ sơ, chất lượng báo cáo và quyền truy cập</p>
          </div>
          <div className="user-filters">
            <label className="search-field">
              <Search size={16} />
              <input
                aria-label="Tìm người dùng theo tên, số điện thoại, email hoặc mã"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm tên, SĐT, email hoặc mã..."
              />
            </label>
            <label className="compact-select">
              <span className="sr-only">Lọc trạng thái</span>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as "all" | UserStatus)
                }
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="review">Cần xem xét</option>
                <option value="blocked">Đã khóa</option>
              </select>
              <ChevronDown size={15} />
            </label>
          </div>
        </div>
        <div className="table-wrap user-table-wrap">
          <table className="user-table">
            <caption className="sr-only">
              Danh sách người dùng cộng đồng, {filtered.length} hồ sơ
            </caption>
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Khu vực</th>
                <th>Đóng góp</th>
                <th>Điểm tin cậy</th>
                <th>Xác thực</th>
                <th>Trạng thái</th>
                <th>Lần cuối hoạt động</th>
                <th>
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td>
                    <button
                      className="user-cell"
                      onClick={() => onSelect(user)}
                    >
                      <span className="table-avatar">{user.initials}</span>
                      <span>
                        <strong>{user.name}</strong>
                        <small>
                          {user.id} · {user.phone}
                        </small>
                      </span>
                    </button>
                  </td>
                  <td data-label="Khu vực">{user.district}</td>
                  <td data-label="Đóng góp">
                    <strong className="report-count">
                      {user.verifiedReports}/{user.reports}
                    </strong>
                    <span className="cell-note">đã xác minh</span>
                  </td>
                  <td data-label="Điểm tin cậy">
                    <div className="score-cell">
                      <strong>{user.trustScore}</strong>
                      <span>
                        <i style={{ width: `${user.trustScore}%` }} />
                      </span>
                    </div>
                  </td>
                  <td data-label="Xác thực">
                    {user.identityVerified ? (
                      <span className="verified-label">
                        <ShieldCheck size={13} /> Đã xác thực
                      </span>
                    ) : (
                      <span className="muted-label">Chưa xác thực</span>
                    )}
                  </td>
                  <td data-label="Trạng thái">
                    <span className={`user-status status-${user.status}`}>
                      {user.status === "active"
                        ? "Hoạt động"
                        : user.status === "review"
                          ? "Xem xét"
                          : "Đã khóa"}
                    </span>
                  </td>
                  <td data-label="Lần cuối hoạt động">{user.lastActive}</td>
                  <td data-label="Thao tác">
                    <IconButton
                      label={`Xem hồ sơ ${user.name}`}
                      onClick={() => onSelect(user)}
                    >
                      <MoreHorizontal size={17} />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <div className="users-empty">
              <Search size={26} />
              <strong>Không tìm thấy người dùng</strong>
              <span>Thử thay đổi từ khóa hoặc bộ lọc trạng thái.</span>
            </div>
          )}
        </div>
        <div className="table-pagination">
          <span>
            Hiển thị {filtered.length} / {users.length} tài khoản từ PostgreSQL
          </span>
          <div>
            <Button variant="secondary" disabled>
              Trước
            </Button>
            <span aria-current="page" className="page-number active">
              1
            </span>
            <Button variant="secondary" disabled>
              Sau
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default UserManagement
