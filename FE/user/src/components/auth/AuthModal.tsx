import { useState } from "react"
import Icon from "@/components/ui/Icon"
import {
  clearAuthSession,
  loginUserApi,
  registerUserApi,
} from "@/lib/api"
import type { CommunityUserProfile } from "@/types"

const HCMC_DISTRICTS = [
  "Quận 1",
  "Quận 3",
  "Quận 4",
  "Quận 5",
  "Quận 7",
  "Quận 10",
  "Quận 12",
  "Bình Thạnh",
  "TP. Thủ Đức",
  "Gò Vấp",
  "Tân Bình",
  "Bình Tân",
  "Bình Chánh",
  "Nhà Bè",
]

function AuthModal({
  open,
  onClose,
  currentUser,
  onAuthSuccess,
  onLogout,
}: {
  open: boolean
  onClose: () => void
  currentUser: CommunityUserProfile | null
  onAuthSuccess: (user: CommunityUserProfile) => void
  onLogout: () => void
}) {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [identifier, setIdentifier] = useState("")
  const [loginPassword, setLoginPassword] = useState("")

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [district, setDistrict] = useState("Bình Thạnh")
  const [regPassword, setRegPassword] = useState("")

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!open) return null

  async function handleLoginSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    if (!identifier.trim() || !loginPassword.trim()) {
      setErrorMsg("Vui lòng nhập đầy đủ Email/Số điện thoại và mật khẩu.")
      return
    }
    setLoading(true)
    const res = await loginUserApi({
      identifier: identifier.trim(),
      password: loginPassword,
    })
    setLoading(false)
    if (!res.ok || !res.user) {
      setErrorMsg(res.message)
      return
    }
    setSuccessMsg(res.message)
    onAuthSuccess(res.user)
  }

  async function handleRegisterSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    if (!name.trim() || !phone.trim() || !email.trim() || !regPassword.trim()) {
      setErrorMsg("Vui lòng điền đầy đủ thông tin đăng ký.")
      return
    }
    if (regPassword.length < 6) {
      setErrorMsg("Mật khẩu phải có ít nhất 6 ký tự.")
      return
    }
    setLoading(true)
    const registeredEmail = email.trim()
    const res = await registerUserApi({
      name: name.trim(),
      phone: phone.trim(),
      email: registeredEmail,
      district,
      password: regPassword,
    })
    setLoading(false)
    if (!res.ok) {
      setErrorMsg(res.message)
      return
    }
    // Chuyển sang tab Đăng nhập để người dùng đăng nhập sau khi đăng ký xong
    setName("")
    setPhone("")
    setEmail("")
    setRegPassword("")
    setIdentifier(registeredEmail)
    setLoginPassword("")
    setMode("login")
    setSuccessMsg(
      "Đăng ký tài khoản thành công! Vui lòng nhập mật khẩu để đăng nhập.",
    )
  }

  function handleQuickFillDemo() {
    setIdentifier("hoanganh.tran@email.vn")
    setLoginPassword("123456")
    setErrorMsg(null)
  }

  return (
    <div
      aria-label="Hộp thoại tài khoản người dùng"
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
            <Icon name="user" size={22} />
          </span>
          <div>
            <h2>
              {currentUser
                ? "Hồ sơ thành viên"
                : mode === "login"
                  ? "Đăng nhập tài khoản"
                  : "Đăng ký thành viên mới"}
            </h2>
            <p className="modal-intro">
              {currentUser
                ? "Thông tin tài khoản và mức độ đóng góp cộng đồng của bạn."
                : "Kết nối tài khoản để gửi báo cáo ngập và nhận cảnh báo sớm."}
            </p>
          </div>
        </div>

        {currentUser ? (
          <div className="auth-profile-view">
            <div className="auth-profile-card">
              <div className="auth-avatar">{currentUser.initials}</div>
              <div className="auth-profile-info">
                <strong>{currentUser.name}</strong>
                <span>
                  {currentUser.id} · {currentUser.district}
                </span>
                <span className="auth-verified-badge">
                  <Icon name="check" size={13} />{" "}
                  {currentUser.identityVerified
                    ? "Đã xác thực danh tính"
                    : "Thành viên cộng đồng"}
                </span>
              </div>
            </div>

            <div className="auth-stats-grid">
              <div className="auth-stat-box">
                <small>Điểm tin cậy</small>
                <strong>{currentUser.trustScore}/100</strong>
              </div>
              <div className="auth-stat-box">
                <small>Báo cáo đã gửi</small>
                <strong>{currentUser.reports}</strong>
              </div>
              <div className="auth-stat-box">
                <small>Đã xác minh</small>
                <strong>{currentUser.verifiedReports}</strong>
              </div>
            </div>

            <div className="auth-detail-list">
              <div>
                <span>Email</span>
                <strong>{currentUser.email}</strong>
              </div>
              <div>
                <span>Số điện thoại</span>
                <strong>{currentUser.phone}</strong>
              </div>
              <div>
                <span>Ngày tham gia</span>
                <strong>{currentUser.joinedAt}</strong>
              </div>
            </div>

            {successMsg && <p className="auth-feedback success">{successMsg}</p>}

            <div className="auth-actions-row">
              <button
                className="auth-logout-button"
                onClick={() => {
                  clearAuthSession()
                  setSuccessMsg(null)
                  onLogout()
                }}
                type="button"
              >
                Đăng xuất
              </button>
              <button
                className="primary-modal-button"
                onClick={onClose}
                type="button"
              >
                Quay lại bản đồ
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="auth-tabs" role="tablist">
              <button
                aria-selected={mode === "login"}
                className={mode === "login" ? "is-active" : ""}
                onClick={() => {
                  setMode("login")
                  setErrorMsg(null)
                  setSuccessMsg(null)
                }}
                role="tab"
                type="button"
              >
                Đăng nhập
              </button>
              <button
                aria-selected={mode === "register"}
                className={mode === "register" ? "is-active" : ""}
                onClick={() => {
                  setMode("register")
                  setErrorMsg(null)
                  setSuccessMsg(null)
                }}
                role="tab"
                type="button"
              >
                Đăng ký mới
              </button>
            </div>

            {errorMsg && <p className="auth-feedback error">{errorMsg}</p>}
            {successMsg && <p className="auth-feedback success">{successMsg}</p>}

            {mode === "login" ? (
              <form className="auth-form" onSubmit={handleLoginSubmit}>
                <label className="auth-field">
                  <span>Email hoặc Số điện thoại</span>
                  <input
                    autoComplete="username"
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="VD: hoanganh.tran@email.vn hoặc 0903 482 615"
                    type="text"
                    value={identifier}
                  />
                </label>

                <label className="auth-field">
                  <span>Mật khẩu</span>
                  <input
                    autoComplete="current-password"
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    type="password"
                    value={loginPassword}
                  />
                </label>

                <div className="auth-demo-hint">
                  <span>Tài khoản mẫu có sẵn (MK: 123456)</span>
                  <button
                    className="auth-quick-fill"
                    onClick={handleQuickFillDemo}
                    type="button"
                  >
                    Điền nhanh: Trần Hoàng Anh
                  </button>
                </div>

                <button
                  className="primary-modal-button"
                  disabled={loading}
                  type="submit"
                >
                  {loading ? "Đang xác thực…" : "Đăng nhập"}
                  <Icon name="arrow" size={20} />
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleRegisterSubmit}>
                <label className="auth-field">
                  <span>Họ và tên</span>
                  <input
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Nguyễn Minh Tuấn"
                    type="text"
                    value={name}
                  />
                </label>

                <div className="auth-form-row">
                  <label className="auth-field">
                    <span>Số điện thoại</span>
                    <input
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="VD: 0909 123 456"
                      type="tel"
                      value={phone}
                    />
                  </label>

                  <label className="auth-field">
                    <span>Khu vực (TP.HCM)</span>
                    <select
                      onChange={(e) => setDistrict(e.target.value)}
                      value={district}
                    >
                      {HCMC_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="auth-field">
                  <span>Địa chỉ Email</span>
                  <input
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="VD: minhtuan@email.vn"
                    type="email"
                    value={email}
                  />
                </label>

                <label className="auth-field">
                  <span>Mật khẩu (tối thiểu 6 ký tự)</span>
                  <input
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Nhập mật khẩu bảo mật…"
                    type="password"
                    value={regPassword}
                  />
                </label>

                <button
                  className="primary-modal-button"
                  disabled={loading}
                  type="submit"
                >
                  {loading ? "Đang tạo tài khoản…" : "Đăng ký tài khoản"}
                  <Icon name="arrow" size={20} />
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default AuthModal
