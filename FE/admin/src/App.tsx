import { useEffect, useState } from "react"
import { Check, X } from "lucide-react"
import Topbar from "@/components/layout/Topbar"
import IconButton from "@/components/ui/IconButton"
import Sidebar from "@/components/layout/Sidebar"
import OverviewPage from "@/components/pages/OverviewPage"
import MapPage from "@/components/pages/MapPage"
import ReportsPage from "@/components/pages/ReportsPage"
import AlertsPage from "@/components/pages/AlertsPage"
import UsersPage from "@/components/pages/UsersPage"
import AnalyticsPage from "@/components/pages/AnalyticsPage"
import ReportReviewModal from "@/components/reports/ReportReviewModal"
import AlertModal from "@/components/alerts/AlertModal"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import UserDetailModal from "@/components/users/UserDetailModal"
import { mockReports, mockAlerts, mockPoints, mockUsers, mockWeather, mockTrends } from "@/data/mockData"
import type {
  AlertDraft,
  AreaAlert,
  CommunityUser,
  FloodReport,
  MapLayer,
  MapPoint,
  Page,
  Severity,
  TrendsMap,
  UserStatus,
  WeatherSnapshot,
} from "@/types"

export default function App() {
  const [reports, setReports] = useState<FloodReport[]>(() => structuredClone(mockReports))
  const [alerts, setAlerts] = useState<AreaAlert[]>(() => structuredClone(mockAlerts))
  const [mapPoints, setMapPoints] = useState<MapPoint[]>(() => structuredClone(mockPoints))
  const trendsData: TrendsMap = mockTrends
  const [weather, setWeather] = useState<WeatherSnapshot | null>(mockWeather)
  const [selectedMapPoint, setSelectedMapPoint] = useState<string | null>("p1")
  const [layers, setLayers] = useState<MapLayer[]>([
    "flood",
    "risk",
    "rain",
    "history",
  ])
  const [severityFilter, setSeverityFilter] = useState<"all" | Severity>("all")
  const [trendRange, setTrendRange] = useState<keyof TrendsMap>("24h")
  const [reviewing, setReviewing] = useState<FloodReport | null>(null)
  const [rejecting, setRejecting] = useState<FloodReport | null>(null)
  const [alertModal, setAlertModal] = useState<{
    mode: "create" | "edit"
    alert?: AreaAlert
  } | null>(null)
  const [endingAlert, setEndingAlert] = useState<AreaAlert | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [page, setPage] = useState<Page>("overview")
  const [users, setUsers] = useState<CommunityUser[]>(() => structuredClone(mockUsers))
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)


  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const displayUsers = users.map((user) => {
    const owned = reports.filter((report) => report.reporterId === user.id)
    return { ...user, reports: owned.length,
      verifiedReports: owned.filter((report) => report.status === "verified").length,
      rejectedReports: owned.filter((report) => report.status === "rejected").length }
  })
  const pendingCount = reports.filter(
    (report) => report.status === "pending",
  ).length
  const activeAlertCount = alerts.filter(
    (alert) => alert.status === "active",
  ).length

  const navigate = (next: Page) => {
    setPage(next)
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const selectMapPoint = (point: MapPoint) => {
    if (selectedMapPoint === point.id) {
      setSelectedMapPoint(null)
      return
    }
    setSelectedMapPoint(point.id)
    if (point.linkedReportId) {
      const report = reports.find(
        (item) => item.id === point.linkedReportId && item.status === "pending",
      )
      if (report) setReviewing(report)
    }
  }

  const handleSyncWeather = () => {
    setWeather({ ...mockWeather })
    setToast("Đã làm mới thời tiết mô phỏng · không kết nối dịch vụ bên ngoài.")
  }

  const approveReport = async () => {
    if (!reviewing) return
    const targetId = reviewing.id

    setReports((current) =>
      current.map((report) =>
        report.id === targetId
          ? { ...report, status: "verified" }
          : report,
      ),
    )
    setMapPoints((current) =>
      current.map((point) =>
        point.linkedReportId === targetId
          ? { ...point, type: "flood" }
          : point,
      ),
    )
    setReviewing(null)
    setToast(`Đã xác nhận báo cáo ${targetId} và cập nhật bản đồ.`)
  }

  const rejectReport = async (reason?: string) => {
    if (!rejecting) return
    const targetId = rejecting.id

    setReports((current) =>
      current.map((report) =>
        report.id === targetId
          ? { ...report, status: "rejected" }
          : report,
      ),
    )
    setMapPoints((current) => current.filter((point) => point.linkedReportId !== targetId))
    setRejecting(null)
    setReviewing(null)
    setToast(
      `Đã từ chối báo cáo ${targetId}${reason ? `: ${reason}` : ""}.`,
    )
  }

  const saveAlert = async (draft: AlertDraft) => {
    if (alertModal?.mode === "edit" && alertModal.alert && alerts.some((a) => a.id === alertModal.alert?.id)) {
      const targetId = alertModal.alert.id

      setAlerts((current) =>
        current.map((alert) =>
          alert.id === targetId ? ({ ...alert, ...draft }) : alert,
        ),
      )
      setToast(`Đã cập nhật cảnh báo ${targetId}.`)
    } else {

      const nextNumber = Math.max(190, ...alerts.map((a) => Number(a.id.replace(/\D/g, "")))) + 1
      setAlerts((current) => [
        {
          id: `AL-${nextNumber}`,
          ...draft,
          startedAt: "18:49",
          status: "active",
          createdBy: "Nguyễn Minh",
        },
        ...current,
      ])
      setToast("Đã tạo cảnh báo mô phỏng · không gửi thông tin ra ngoài.")
    }
    setAlertModal(null)
  }

  const endAlert = async () => {
    if (!endingAlert) return
    const targetId = endingAlert.id

    setAlerts((current) =>
      current.map((alert) =>
        alert.id === targetId
          ? ({ ...alert, status: "ended" })
          : alert,
      ),
    )
    setToast(`Đã kết thúc cảnh báo ${targetId}.`)
    setEndingAlert(null)
  }

  const selectedUser = displayUsers.find((user) => user.id === selectedUserId) ?? null

  const exportUsers = async () => {
    const statusLabel: Record<UserStatus, string> = {
      active: "Hoạt động",
      review: "Cần xem xét",
      blocked: "Đã khóa",
    }
    const header = [
      "Mã người dùng",
      "Họ tên",
      "Khu vực",
      "Báo cáo",
      "Đã xác minh",
      "Từ chối",
      "Điểm tin cậy",
      "Xác thực",
      "Trạng thái",
      "Hoạt động cuối",
    ]
    const rows = displayUsers.map((user) => [
      user.id,
      user.name,
      user.district,
      String(user.reports),
      String(user.verifiedReports),
      String(user.rejectedReports),
      String(user.trustScore),
      user.identityVerified ? "Đã xác thực" : "Chưa xác thực",
      statusLabel[user.status],
      user.lastActive,
    ])
    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
      )
      .join("\r\n")
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "saigondrain-nguoi-dung.csv"
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setToast("Đã xuất danh sách người dùng ra tệp CSV.")
  }

  const updateUserStatus = async (status: UserStatus) => {
    if (!selectedUser) return
    const targetId = selectedUser.id

    setUsers((current) =>
      current.map((user) =>
        user.id === targetId ? ({ ...user, status }) : user,
      ),
    )
    setToast(
      status === "blocked"
        ? `Đã khóa tài khoản ${targetId}.`
        : status === "review"
          ? `Đã chuyển ${targetId} vào danh sách xem xét.`
          : `Đã mở khóa tài khoản ${targetId}.`,
    )
    setSelectedUserId(null)
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeAlertCount={activeAlertCount}
        onNavigate={navigate}
        open={sidebarOpen}
        page={page}
        pendingCount={pendingCount}
        setOpen={setSidebarOpen}
      />
      <main className="main">
        <Topbar
          onCreateAlert={() => setAlertModal({ mode: "create" })}
          onExportUsers={exportUsers}
          onOpenMenu={() => setSidebarOpen(true)}
          onSyncWeather={handleSyncWeather}
          page={page}
          weather={weather}
        />

        <div className="content">
          {page === "overview" && (
            <OverviewPage
              alerts={alerts}
              layers={layers}
              onEditAlert={(alert) => setAlertModal({ mode: "edit", alert })}
              onEndAlert={setEndingAlert}
              onNavigate={navigate}
              onReview={setReviewing}
              onSelectPoint={selectMapPoint}
              points={mapPoints}
              reports={reports}
              selectedMapPoint={selectedMapPoint}
              setLayers={setLayers}
              setSeverityFilter={setSeverityFilter}
              setTrendRange={setTrendRange}
              severityFilter={severityFilter}
              trendRange={trendRange}
              trendsData={trendsData}
              weather={weather}
            />
          )}
          {page === "map" && (
            <MapPage
              layers={layers}
              onSelectPoint={selectMapPoint}
              points={mapPoints}
              reports={reports}
              selectedMapPoint={selectedMapPoint}
              setLayers={setLayers}
              setSeverityFilter={setSeverityFilter}
              severityFilter={severityFilter}
            />
          )}
          {page === "reports" && (
            <ReportsPage onReview={setReviewing} reports={reports} />
          )}
          {page === "alerts" && (
            <AlertsPage
              alerts={alerts}
              weather={weather}
              points={mapPoints}
              onEdit={(alert) => setAlertModal({ mode: "edit", alert })}
              onEnd={setEndingAlert}
            />
          )}
          {page === "users" && (
            <UsersPage
              onSelect={(user) => setSelectedUserId(user.id)}
              users={displayUsers}
            />
          )}
          {page === "analytics" && (
            <AnalyticsPage
              alerts={alerts}
              points={mapPoints}
              reports={reports}
              setTrendRange={setTrendRange}
              trendRange={trendRange}
              trendsData={trendsData}
              users={displayUsers}
            />
          )}

          <footer className="page-footer">
            <span>SaigonDrain AI · Trung tâm điều hành đô thị thông minh</span>
            <span>
              Dữ liệu mô phỏng · Thay đổi chỉ lưu trong phiên, tải lại để đặt lại
            </span>
          </footer>
        </div>
      </main>

      {reviewing && (
        <ReportReviewModal
          report={reviewing}
          reports={reports}
          onClose={() => setReviewing(null)}
          onApprove={approveReport}
          onReject={() => {
            setRejecting(reviewing)
            setReviewing(null)
          }}
        />
      )}
      {rejecting && (
        <ConfirmDialog
          title="Từ chối báo cáo?"
          description="Báo cáo sẽ được loại khỏi hàng chờ và không dùng để cập nhật cảnh báo."
          confirmLabel="Xác nhận từ chối"
          onClose={() => setRejecting(null)}
          onConfirm={rejectReport}
          withReason
        />
      )}
      {alertModal && (
        <AlertModal
          initial={alertModal.alert}
          onClose={() => setAlertModal(null)}
          onSave={saveAlert}
        />
      )}
      {endingAlert && (
        <ConfirmDialog
          title="Kết thúc cảnh báo?"
          description={`${endingAlert.area} sẽ không còn hiển thị là khu vực đang cảnh báo.`}
          confirmLabel="Kết thúc cảnh báo"
          onClose={() => setEndingAlert(null)}
          onConfirm={endAlert}
        />
      )}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUserId(null)}
          onStatusChange={updateUserStatus}
        />
      )}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <span>
            <Check size={16} />
          </span>
          {toast}
          <IconButton label="Đóng thông báo" onClick={() => setToast(null)}>
            <X size={14} />
          </IconButton>
        </div>
      )}
    </div>
  )
}
