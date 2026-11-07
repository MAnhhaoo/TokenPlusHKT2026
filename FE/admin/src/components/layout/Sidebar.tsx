import { useEffect, useRef, useState } from "react"
import {
  AlertTriangle,
  BarChart3,
  Droplets,
  LayoutDashboard,
  Map,
  MoreHorizontal,
  Users,
  X,
} from "lucide-react"
import IconButton from "@/components/ui/IconButton"
import type { Page } from "@/types"

function Sidebar({
  open,
  setOpen,
  page,
  onNavigate,
  pendingCount,
  activeAlertCount,
}: {
  open: boolean
  setOpen: (value: boolean) => void
  page: Page
  onNavigate: (page: Page) => void
  pendingCount: number
  activeAlertCount: number
}) {
  const asideRef = useRef<HTMLElement>(null)
  const [vnClock, setVnClock] = useState(() =>
    new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date()),
  )

  useEffect(() => {
    const timer = window.setInterval(() => {
      setVnClock(
        new Intl.DateTimeFormat("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(new Date()),
      )
    }, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement as HTMLElement | null
    const frame = window.requestAnimationFrame(() => {
      asideRef.current
        ?.querySelector<HTMLButtonElement>(".sidebar-close")
        ?.focus()
    })
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        setOpen(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("keydown", onKeyDown)
      previousFocus?.focus()
    }
  }, [open, setOpen])

  const nav: {
    label: string
    icon: typeof LayoutDashboard
    page: Page
    count?: number
  }[] = [
    { label: "Tổng quan", icon: LayoutDashboard, page: "overview" },
    { label: "Bản đồ vận hành", icon: Map, page: "map" },
    {
      label: "Báo cáo cộng đồng",
      icon: Droplets,
      page: "reports",
      count: pendingCount,
    },
    {
      label: "Cảnh báo khu vực",
      icon: AlertTriangle,
      page: "alerts",
      count: activeAlertCount,
    },
    { label: "Người dùng", icon: Users, page: "users" },
    { label: "Phân tích dữ liệu", icon: BarChart3, page: "analytics" },
  ]

  return (
    <>
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label="Đóng menu"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${open ? "is-open" : ""}`}
        ref={asideRef}
      >
        <div className="brand">
          <span className="brand-mark">
            <svg aria-hidden="true" fill="none" viewBox="0 0 40 40">
              <path
                d="M7 15.5c3.4-3.1 6.6-3.1 10 0s6.6 3.1 10 0 6.6-3.1 10 0"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2.6"
              />
              <path
                d="M5 22c3.4-3.1 6.6-3.1 10 0s6.6 3.1 10 0 6.6-3.1 10 0"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2.6"
              />
              <path
                d="M9 28.5c3.4-3.1 6.6-3.1 10 0s6.6 3.1 10 0"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2.6"
              />
              <circle cx="31.5" cy="8.5" fill="#F4C95D" r="3.4" />
            </svg>
          </span>
          <div className="brand-copy">
            <span className="brand-name">
              Saigon<span>Drain</span>
              <small>AI</small>
            </span>
            <p>Trung tâm điều hành</p>
          </div>
          <IconButton
            label="Đóng menu"
            className="sidebar-close"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </IconButton>
        </div>

        <nav className="nav" aria-label="Điều hướng chính">
          <span className="nav-label">Không gian làm việc</span>
          {nav.map((item) => {
            const active = page === item.page
            return (
              <button
                key={item.label}
                aria-current={active ? "page" : undefined}
                className={`nav-item ${active ? "active" : ""}`}
                onClick={() => {
                  onNavigate(item.page)
                  setOpen(false)
                }}
                type="button"
              >
                <item.icon size={19} strokeWidth={1.8} />
                <span>{item.label}</span>
                {typeof item.count === "number" && item.count > 0 && (
                  <span className="nav-count">{item.count}</span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="system-card">
            <div className="system-head">
              <span className="status-dot" />
              <strong>Hệ thống hoạt động</strong>
            </div>
            <p>Đồng bộ lúc {vnClock} (GMT+7) · 12 cảm biến</p>
            <div className="signal-bars" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="user-row">
            <div className="avatar">NM</div>
            <div>
              <strong>Nguyễn Minh</strong>
              <span>Điều phối viên</span>
            </div>
            <MoreHorizontal size={18} />
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
